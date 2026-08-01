// 🚀 ENTERPRISE API CLIENT - 35 YILLIK TECRÜBEYİ YANSITAN KOD
// Hata yönetimi, retry logic, interceptors, offline support

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, isCancel } from 'axios';
export { isCancel as isRequestCancelled };
import { Platform } from 'react-native';
import { API_CONFIG, APP_CONFIG } from '../../constants';
import { StorageService } from '../storage/StorageService';

const HTML_CONTENT_TYPE = 'text/html';
const SECURITY_CHALLENGE_PATTERNS = [
  /one moment, please/i,
  /being verified/i,
  /cf-browser-verification/i,
  /cloudflare/i,
  /attention required/i,
  /just a moment/i,
];

const getFullUrl = (config?: AxiosRequestConfig) => {
  if (!config) {
    return undefined;
  }

  return `${config.baseURL ?? ''}${config.url ?? ''}`;
};

const normalizeString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (!value) {
    return '';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const isHtmlResponse = (data: unknown, contentType?: string): boolean => {
  if (contentType?.toLowerCase().includes(HTML_CONTENT_TYPE)) {
    return true;
  }

  if (typeof data !== 'string') {
    return false;
  }

  const html = data.trim().toLowerCase();
  return html.startsWith('<!doctype html') || html.startsWith('<html');
};

const isSecurityChallengeResponse = (data: unknown, contentType?: string): boolean => {
  const payload = normalizeString(data);

  if (!payload) {
    return false;
  }

  if (!isHtmlResponse(data, contentType) && !SECURITY_CHALLENGE_PATTERNS.some((pattern) => pattern.test(payload))) {
    return false;
  }

  return SECURITY_CHALLENGE_PATTERNS.some((pattern) => pattern.test(payload));
};

const buildNetworkErrorMessage = (error: AxiosError): string => {
  const rawMessage = `${error.message ?? ''} ${error.code ?? ''}`.toLowerCase();
  const requestUrl = getFullUrl(error.config)?.toLowerCase() ?? '';
  const isHttpsRequest = requestUrl.startsWith('https://');

  if (rawMessage.includes('ssl') || rawMessage.includes('certificate') || rawMessage.includes('handshake')) {
    return 'Güvenli bağlantı kurulamadı. Android cihaz sunucunun SSL sertifikasını doğrulayamadı.';
  }

  if (rawMessage.includes('timeout') || error.code === 'ECONNABORTED') {
    return 'Sunucu yanıtı zaman aşımına uğradı. Lütfen tekrar deneyin.';
  }

  if (rawMessage.includes('network request failed') || rawMessage.includes('network error')) {
    if (Platform.OS === 'android' && isHttpsRequest) {
      return 'Güvenli bağlantı kurulamadı. Sunucunun SSL sertifika zinciri Android tarafında doğrulanamıyor olabilir.';
    }

    return 'Sunucuya erişilemedi. Android cihaz isteği gönderdi ancak yanıt alamadı.';
  }

  if (rawMessage.includes('unable to resolve host') || rawMessage.includes('name or service not known')) {
    return 'Sunucu adresi çözümlenemedi. DNS veya operatör kaynaklı erişim sorunu olabilir.';
  }

  if (rawMessage.includes('cleartext')) {
    return 'Android güvenlik politikası HTTP isteğini engelledi. API adresi HTTPS olmalıdır.';
  }

  return 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.';
};

const buildSecurityChallengeMessage = (): string => {
  return 'Sunucu güvenlik doğrulaması mobil uygulama isteğini engelledi. Cloudflare veya WAF tarafinda /api/mobile/* icin challenge kapatilmalidir.';
};

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Client-Platform': Platform.OS,
        'X-Mobile-App': 'true',
        'X-App-Version': APP_CONFIG.VERSION,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Token ekleme
    this.client.interceptors.request.use(
      async (config) => {
        const token = await StorageService.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - Hata yönetimi
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const contentType = response.headers?.['content-type'];
        if (isSecurityChallengeResponse(response.data, contentType)) {
          const challengeError: any = new Error(buildSecurityChallengeMessage());
          challengeError.response = response;
          challengeError.status = response.status;
          challengeError.statusText = response.statusText;
          challengeError.data = response.data;
          challengeError.url = getFullUrl(response.config);
          challengeError.diagnosticCode = 'SECURITY_CHALLENGE';
          throw challengeError;
        }

        return response;
      },
      async (error: AxiosError) => {
        // İptal edilen istekleri (AbortController) dönüştürmeden ilet
        if (isCancel(error)) {
          return Promise.reject(error);
        }

        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
        const isLoginRequest = originalRequest?.url?.includes('auth/login') ?? false;
        const isMobileApiRequest = originalRequest?.url?.includes('/api/mobile/') ?? false;
        const isMonitoringRequest = originalRequest?.url?.includes('monitoring/log-error') ?? false;

        // Sistem sağlığı izleme: 5xx, 429 ve ağ hatalarını sunucuya rapor et.
        // Monitoring endpoint'inin kendi hatasını raporlamaya çalışmayız (sonsuz döngü).
        if (!isMonitoringRequest) {
          const status = error.response?.status;
          if (!error.response || status === 429 || (status && status >= 500)) {
            import('../monitoring/MonitoringService').then(({ MonitoringService }) => {
              MonitoringService.reportError(
                error.message || `HTTP ${status ?? 'network'} hatası`,
                {
                  type: 'mobile_api_error',
                  severity: status === 429 ? 'warning' : 'critical',
                  screen: getFullUrl(originalRequest),
                }
              );
            }).catch(() => {});
          }
        }

        // Sadece mobil auth token akışına ait endpoint'lerde 401 gelirse oturumu kapat.
        if (error.response?.status === 401 && !isLoginRequest && isMobileApiRequest) {
          await StorageService.clearAuth();

          const { useAuthStore } = await import('../../store/authStore');
          useAuthStore.setState({
            user: null,
            isAuthenticated: false,
            isEmployee: false,
            isLoading: false,
            error: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
          });
        }

        // Network error handling
        if (!error.response) {
          console.error('🌐 Network Error:', error.message);
          console.error('🌐 Error Code:', error.code);
          console.error('🌐 Error Config:', {
            baseURL: error.config?.baseURL,
            url: error.config?.url,
            method: error.config?.method,
            fullURL: getFullUrl(error.config),
          });

          const networkError: any = new Error(buildNetworkErrorMessage(error));
          networkError.code = error.code;
          networkError.config = error.config;
          networkError.url = getFullUrl(error.config);
          networkError.diagnosticCode = 'NETWORK_ERROR';
          throw networkError;
        }

        // Server error handling
        const status = error.response.status;
        const statusText = error.response.statusText;
        const data: any = error.response.data ?? {};
        const config = error.config;
        const contentType = error.response.headers?.['content-type'];

        // Custom error messages - Orijinal error bilgilerini koruyarak
        const customError: any = new Error();
        customError.message = (() => {
          if (isSecurityChallengeResponse(data, contentType)) {
            customError.diagnosticCode = 'SECURITY_CHALLENGE';
            return buildSecurityChallengeMessage();
          }

          if (isHtmlResponse(data, contentType)) {
            customError.diagnosticCode = 'HTML_RESPONSE';
            return 'API yerine HTML sayfasi dondu. Sunucu veya güvenlik katmani mobil istegi engelliyor olabilir.';
          }

          switch (status) {
            case 400:
              return data.message || 'Geçersiz istek';
            case 401:
              return 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.';
            case 403:
              return 'Bu işlem için yetkiniz yok';
            case 404:
              return 'Kaynak bulunamadı';
            case 422:
              return data.message || 'Doğrulama hatası';
            case 429:
              return 'Çok fazla istek gönderildi. Lütfen birkaç saniye bekleyip tekrar deneyin.';
            case 500:
              return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
            default:
              return data.message || 'Bilinmeyen hata oluştu';
          }
        })();
        
        // Orijinal error bilgilerini koru
        customError.response = error.response;
        customError.config = config;
        customError.status = status;
        customError.statusText = statusText;
        customError.data = data;
        customError.url = getFullUrl(config);
        
        throw customError;
      }
    );
  }

  // ==================== HTTP METHODS ====================
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  // ==================== RETRY LOGIC ====================
  async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = API_CONFIG.RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // 429 Too Many Requests — retry etme, direkt fırlat
        if ((error as any).status === 429) {
          throw error;
        }

        if (attempt === maxAttempts) {
          break;
        }

        // Exponential backoff
        const delay = API_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

      }
    }

    throw lastError!;
  }

  // ==================== FILE UPLOAD ====================
  async uploadFile<T = any>(
    url: string,
    file: any,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  // ==================== HEALTH CHECK ====================
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/api/mobile/health');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const apiClient = new ApiClient();
