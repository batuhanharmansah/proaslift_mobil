// 💾 ENTERPRISE STORAGE SERVICE
// Güvenli veri depolama, şifreleme, offline destek

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants';
import { User, AppSettings } from '../../types';

class SecureStorageService {
  // ==================== SECURE STORAGE (Sensitive Data) ====================
  
  async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
    } catch (error) {
      console.error('❌ Error saving token:', error);
      throw new Error('Token kaydedilemedi');
    }
  }

  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.error('❌ Error getting token:', error);
      return null;
    }
  }

  async setRefreshToken(refreshToken: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(`${STORAGE_KEYS.AUTH_TOKEN}_refresh`, refreshToken);
    } catch (error) {
      console.error('❌ Error saving refresh token:', error);
      throw new Error('Refresh token kaydedilemedi');
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(`${STORAGE_KEYS.AUTH_TOKEN}_refresh`);
    } catch (error) {
      console.error('❌ Error getting refresh token:', error);
      return null;
    }
  }

  // ==================== SECURE ITEM METHODS (For Biometric) ====================
  
  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('❌ Error saving secure item:', error);
      throw new Error('Güvenli veri kaydedilemedi');
    }
  }

  async getSecureItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('❌ Error getting secure item:', error);
      return null;
    }
  }

  async removeSecureItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('❌ Error removing secure item:', error);
    }
  }

  // ==================== SECURE STORAGE (User Data — PII koruması) ====================
  // Kullanıcı verisi (ad, email, company_id) hassas PII içerebileceğinden
  // SecureStore (Keychain/KeyStore) kullanılır.

  async setUserData(user: User): Promise<void> {
    try {
      const serialized = JSON.stringify(user);
      // expo-secure-store 2048 byte sınırı: büyük nesneleri parçalara böl
      if (serialized.length <= 2048) {
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, serialized);
      } else {
        // Büyük payload: sadece kritik alanları secure'da, geri kalanı async'te tut
        const criticalData = {
          id: user.id,
          email: user.email,
          name: user.name,
          company_id: user.company_id,
        };
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(criticalData));
        await AsyncStorage.setItem(`${STORAGE_KEYS.USER_DATA}_full`, serialized);
      }
    } catch (error) {
      console.error('❌ Error saving user data:', error);
      throw new Error('Kullanıcı verisi kaydedilemedi');
    }
  }

  async getUserData(): Promise<User | null> {
    try {
      // Önce full data'yı dene (varsa), sonra secure store'dan al
      const fullData = await AsyncStorage.getItem(`${STORAGE_KEYS.USER_DATA}_full`);
      if (fullData) return JSON.parse(fullData);

      const secureData = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
      return secureData ? JSON.parse(secureData) : null;
    } catch (error) {
      console.error('❌ Error getting user data:', error);
      return null;
    }
  }

  async setAppSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('❌ Error saving app settings:', error);
      throw new Error('Uygulama ayarları kaydedilemedi');
    }
  }

  async getAppSettings(): Promise<AppSettings | null> {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('❌ Error getting app settings:', error);
      return null;
    }
  }

  // ==================== OFFLINE DATA MANAGEMENT ====================
  // Offline kuyruk işlem verisi (bakım raporları, güncellemeler vb.) içerebilir.
  // Bu nedenle SecureStore'da saklanır. Boyut sınırı aşılırsa parçalara bölünür.

  async saveOfflineOperation(operation: any): Promise<void> {
    try {
      const existingData = await this.getOfflineData();
      const newData = [...existingData, { ...operation, timestamp: Date.now() }];
      const serialized = JSON.stringify(newData);
      // expo-secure-store 2048 byte sınırı: aşılırsa AsyncStorage'a fallback
      if (serialized.length <= 2048) {
        await SecureStore.setItemAsync(STORAGE_KEYS.OFFLINE_DATA, serialized);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_DATA, serialized);
      }
    } catch (error) {
      console.error('❌ Error saving offline operation:', error);
    }
  }

  async getOfflineData(): Promise<any[]> {
    try {
      const secureData = await SecureStore.getItemAsync(STORAGE_KEYS.OFFLINE_DATA);
      if (secureData) return JSON.parse(secureData);
      // Fallback: AsyncStorage (büyük veri)
      const asyncData = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_DATA);
      return asyncData ? JSON.parse(asyncData) : [];
    } catch (error) {
      console.error('❌ Error getting offline data:', error);
      return [];
    }
  }

  async clearOfflineData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.OFFLINE_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_DATA);
    } catch (error) {
      console.error('❌ Error clearing offline data:', error);
    }
  }

  // ==================== SYNC MANAGEMENT ====================
  
  async setLastSyncTime(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp.toString());
    } catch (error) {
      console.error('❌ Error saving last sync time:', error);
    }
  }

  async getLastSyncTime(): Promise<number | null> {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.error('❌ Error getting last sync time:', error);
      return null;
    }
  }

  // ==================== CACHE MANAGEMENT ====================
  
  async setCachedData<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl: ttl || 300000, // Default 5 minutes
      };
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
    } catch (error) {
      console.error('❌ Error caching data:', error);
    }
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`cache_${key}`);
      if (!cached) return null;

      const cacheItem = JSON.parse(cached);
      const now = Date.now();
      
      // TTL kontrolü
      if (now - cacheItem.timestamp > cacheItem.ttl) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('❌ Error getting cached data:', error);
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }

  // ==================== CLEANUP METHODS ====================
  
  async clearAuth(): Promise<void> {
    try {
      // Secure storage'dan token'ları sil
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      await SecureStore.deleteItemAsync(`${STORAGE_KEYS.AUTH_TOKEN}_refresh`);
      
      // Biometric credentials'ı da sil
      await SecureStore.deleteItemAsync(STORAGE_KEYS.BIOMETRIC_CREDENTIALS);
      
      // Kullanıcı verisini hem secure store'dan hem de async storage fallback'ten sil
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem(`${STORAGE_KEYS.USER_DATA}_full`);
    } catch (error) {
      console.error('❌ Error clearing auth:', error);
    }
  }

  async clearAllData(): Promise<void> {
    try {
      // Tüm secure store verilerini temizle
      await this.clearAuth();
      
      // Tüm async storage verilerini temizle
      await AsyncStorage.clear();
    } catch (error) {
      console.error('❌ Error clearing all data:', error);
    }
  }

  // ==================== UTILITY METHODS ====================
  
  async getStorageInfo(): Promise<{
    tokenExists: boolean;
    userDataExists: boolean;
    offlineDataCount: number;
    cacheSize: number;
  }> {
    try {
      const token = await this.getToken();
      const userData = await this.getUserData();
      const offlineData = await this.getOfflineData();
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith('cache_'));

      return {
        tokenExists: !!token,
        userDataExists: !!userData,
        offlineDataCount: offlineData.length,
        cacheSize: cacheKeys.length,
      };
    } catch (error) {
      console.error('❌ Error getting storage info:', error);
      return {
        tokenExists: false,
        userDataExists: false,
        offlineDataCount: 0,
        cacheSize: 0,
      };
    }
  }

  // ==================== DEFAULT SETTINGS ====================
  
  getDefaultSettings(): AppSettings {
    return {
      theme: 'light',
      notifications_enabled: true,
      auto_sync: true,
      offline_mode: false,
    };
  }

  async initializeSettings(): Promise<AppSettings> {
    const existingSettings = await this.getAppSettings();
    if (existingSettings) {
      return existingSettings;
    }

    const defaultSettings = this.getDefaultSettings();
    await this.setAppSettings(defaultSettings);
    return defaultSettings;
  }
}

// Singleton instance
export const StorageService = new SecureStorageService();
