// 🔐 ENTERPRISE AUTHENTICATION SERVICE
// JWT token yönetimi, güvenli depolama, oturum yönetimi

import { apiClient } from '../api/client';
import { StorageService } from '../storage/StorageService';
import { API_ENDPOINTS } from '../../constants';
import { User, LoginCredentials, AuthResponse } from '../../types';
import { pushNotificationService } from '../notifications/PushNotificationService';

class AuthenticationService {
  private currentUser: User | null = null;

  // ==================== LOGIN ====================
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // apiClient.post() zaten response.data döndürüyor; bu API body = { success, message, data: { user, token } }
      const apiBody = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.LOGIN,
        credentials
      );

      if (apiBody?.success && apiBody?.data) {
        const { user, token } = apiBody.data;
        if (!user || !token) {
          throw new Error(apiBody.message || 'Sunucu yanıtı geçersiz');
        }
        await StorageService.setToken(token);
        await StorageService.setUserData(user);
        this.currentUser = user;
        return apiBody;
      }

      throw new Error(apiBody?.message || 'Giriş başarısız');
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('E-posta veya şifre hatalı');
      }
      if (error.response?.status === 403) {
        throw new Error(error.response?.data?.message || 'Hesabınız askıya alınmış');
      }
      if (error.response?.status === 422) {
        const errors = error.response.data?.errors;
        const firstError = errors ? (Object.values(errors)[0] as string[])?.[0] : null;
        throw new Error(firstError || 'Doğrulama hatası');
      }
      throw error;
    }
  }

  // ==================== LOGOUT ====================
  async logout(): Promise<void> {
    try {
      await pushNotificationService.unregisterCurrentDevice();
      // Server'a logout isteği gönder
      await apiClient.post(API_ENDPOINTS.LOGOUT);
    } catch (error) {
      console.warn('⚠️ Logout request failed:', error);
      // Server hatası olsa bile local logout yap
    } finally {
      // Local verileri temizle
      await this.clearLocalAuth();
    }
  }

  private async clearLocalAuth(): Promise<void> {
    await StorageService.clearAuth();
    this.currentUser = null;
  }

  // ==================== TOKEN VALIDATION ====================
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await StorageService.getToken();
      if (!token) {
        return false;
      }

      // Token'ın geçerliliğini kontrol et - önce cached user'ı kontrol et
      const cachedUser = await StorageService.getUserData();
      if (cachedUser) {
        return true;
      }

      // Eğer cached user yoksa API'den al (timeout ile)
      const user = await this.getCurrentUser();
      return !!user;
    } catch (error: any) {
      console.warn('⚠️ Token validation failed:', error.message || error);
      // Hata durumunda token'ı temizleme, sadece false dön
      return false;
    }
  }

  // ==================== USER DATA ====================
  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      // Önce local storage'dan dene
      const cachedUser = await StorageService.getUserData();
      if (cachedUser) {
        this.currentUser = cachedUser;
        return cachedUser;
      }

      // Server'dan güncel kullanıcı bilgilerini al - timeout ile
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('API timeout')), 3000);
      });

      const apiPromise = apiClient.get<{ data: User }>(API_ENDPOINTS.PROFILE);
      const response = await Promise.race([apiPromise, timeoutPromise]);
      const user = response.data;
      
      await StorageService.setUserData(user);
      this.currentUser = user;

      return user;
    } catch (error: any) {
      console.error('❌ Get current user error:', error.message || error);
      // Hata durumunda cached user'ı kullan veya null dön
      const cachedUser = await StorageService.getUserData();
      if (cachedUser) {
        this.currentUser = cachedUser;
        return cachedUser;
      }
      return null;
    }
  }

  // ==================== PROFILE UPDATE ====================
  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.put<{ data: User }>(
        API_ENDPOINTS.PROFILE,
        userData
      );

      const updatedUser = response.data;
      await StorageService.setUserData(updatedUser);
      this.currentUser = updatedUser;

      return updatedUser;
    } catch (error) {
      console.error('❌ Update profile error:', error);
      throw error;
    }
  }

  // ==================== PASSWORD CHANGE ====================
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.CHANGE_PASSWORD, {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPassword,
      });

    } catch (error) {
      console.error('❌ Change password error:', error);
      throw error;
    }
  }

  // ==================== AUTO LOGIN ====================
  async attemptAutoLogin(): Promise<boolean> {
    try {
      const token = await StorageService.getToken();
      if (!token) {
        return false;
      }

      const user = await this.getCurrentUser();
      if (user) {
        return true;
      }

      return false;
    } catch (error) {
      console.warn('⚠️ Auto login failed:', error);
      await this.clearLocalAuth();
      return false;
    }
  }

  // ==================== COMPANY INFO ====================
  async getCompanyInfo(): Promise<any> {
    try {
      const user = await this.getCurrentUser();
      if (!user?.company_id) {
        throw new Error('Kullanıcı firma bilgisi bulunamadı');
      }

      const response = await apiClient.get(`/api/companies/${user.company_id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Get company info error:', error);
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================
  getCurrentUserId(): number | null {
    return this.currentUser?.id || null;
  }

  getCurrentCompanyId(): number | null {
    return this.currentUser?.company_id || null;
  }

  isUserLoggedIn(): boolean {
    return !!this.currentUser;
  }

  // ==================== OFFLINE SUPPORT ====================
  async syncOfflineData(): Promise<void> {
    try {
      const offlineData = await StorageService.getOfflineData();
      if (!offlineData || offlineData.length === 0) {
        return;
      }

      for (const operation of offlineData) {
        try {
          // operation structure: { method, url, data }
          const { method, url, data } = operation;
          
          switch (method?.toUpperCase()) {
            case 'GET':
              await apiClient.get(url);
              break;
            case 'POST':
              await apiClient.post(url, data);
              break;
            case 'PUT':
              await apiClient.put(url, data);
              break;
            case 'DELETE':
              await apiClient.delete(url);
              break;
            default:
              console.warn('⚠️ Unknown operation method:', method);
          }
          
        } catch (error) {
          console.error('❌ Failed to sync operation:', operation.url || 'unknown', error);
        }
      }

      // Başarılı sync sonrası offline data'yı temizle
      await StorageService.clearOfflineData();
    } catch (error) {
      console.error('❌ Offline sync error:', error);
    }
  }
}

// Singleton instance
export const AuthService = new AuthenticationService();
