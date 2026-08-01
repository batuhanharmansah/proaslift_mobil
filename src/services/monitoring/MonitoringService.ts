// 📟 MONITORING SERVICE - Mobil hata/crash raporlama
// Sunucudaki sistem sağlığı izleme sayfasına (system_events) fire-and-forget rapor gönderir.
// Bu servis KENDİSİ asla hata fırlatmaz ve raporlama isteğini asla tekrar raporlamaz (sonsuz döngü riski).

import { API_ENDPOINTS, API_CONFIG, APP_CONFIG } from '../../constants';
import { StorageService } from '../storage/StorageService';

export type MonitoringSeverity = 'critical' | 'warning' | 'info';
export type MonitoringType = 'mobile_crash' | 'mobile_api_error';

let currentScreen: string | undefined;

export const MonitoringService = {
  setCurrentScreen(screenName: string | undefined) {
    currentScreen = screenName;
  },

  reportError(
    message: string,
    options?: { type?: MonitoringType; severity?: MonitoringSeverity; stack?: string; screen?: string }
  ): void {
    // apiClient burada kullanılmıyor (bu servis apiClient'in kendi interceptor'ından
    // çağrılıyor, döngüsel bağımlılık riski var) — doğrudan fetch kullanılır.
    (async () => {
      try {
        const token = await StorageService.getToken();
        if (!token) {
          return; // giriş yapılmadan önceki hatalar şimdilik raporlanmıyor
        }

        await fetch(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.LOG_ERROR}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: options?.type ?? 'mobile_api_error',
            severity: options?.severity ?? 'warning',
            message: message?.slice(0, 2000) ?? 'Bilinmeyen hata',
            stack_trace: options?.stack?.slice(0, 8000),
            screen: options?.screen ?? currentScreen,
            app_version: APP_CONFIG.VERSION,
          }),
        });
      } catch {
        // sessizce yut — izleme, kullanıcı deneyimini asla etkilemesin
      }
    })();
  },
};
