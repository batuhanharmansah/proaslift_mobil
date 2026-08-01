// 🔐 BIOMETRIC AUTHENTICATION SERVICE
// Face ID / Touch ID / Fingerprint desteği

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { StorageService } from '../storage/StorageService';
import { STORAGE_KEYS } from '../../constants';

export interface BiometricCredentials {
  email: string;
  password: string;
}

class BiometricService {
  // ==================== BIOMETRIC TYPES ====================
  private getBiometricType(): string {
    if (Platform.OS === 'ios') {
      return 'Face ID / Touch ID';
    } else {
      return 'Parmak İzi / Yüz Tanıma';
    }
  }

  // ==================== CHECK AVAILABILITY ====================
  async isAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        return false;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.error('❌ Biometric availability check error:', error);
      return false;
    }
  }

  // ==================== GET SUPPORTED TYPES ====================
  async getSupportedTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.error('❌ Get supported types error:', error);
      return [];
    }
  }

  // ==================== AUTHENTICATE ====================
  async authenticate(reason?: string): Promise<boolean> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || `${this.getBiometricType()} ile giriş yapın`,
        cancelLabel: 'İptal',
        disableDeviceFallback: false, // Şifre ile giriş seçeneği
        fallbackLabel: 'Şifre kullan',
      });

      return result.success;
    } catch (error) {
      console.error('❌ Biometric authentication error:', error);
      return false;
    }
  }

  // ==================== SAVE CREDENTIALS ====================
  async saveCredentials(credentials: BiometricCredentials): Promise<void> {
    try {
      // Credentials'ı şifreleyerek secure store'a kaydet
      const credentialsJson = JSON.stringify(credentials);
      await StorageService.setSecureItem(STORAGE_KEYS.BIOMETRIC_CREDENTIALS, credentialsJson);
    } catch (error) {
      console.error('❌ Save credentials error:', error);
      throw new Error('Kimlik bilgileri kaydedilemedi');
    }
  }

  // ==================== GET CREDENTIALS ====================
  async getCredentials(): Promise<BiometricCredentials | null> {
    try {
      const credentialsJson = await StorageService.getSecureItem(STORAGE_KEYS.BIOMETRIC_CREDENTIALS);
      if (!credentialsJson) {
        return null;
      }

      return JSON.parse(credentialsJson) as BiometricCredentials;
    } catch (error) {
      console.error('❌ Get credentials error:', error);
      return null;
    }
  }

  // ==================== DELETE CREDENTIALS ====================
  async deleteCredentials(): Promise<void> {
    try {
      await StorageService.removeSecureItem(STORAGE_KEYS.BIOMETRIC_CREDENTIALS);
    } catch (error) {
      console.error('❌ Delete credentials error:', error);
    }
  }

  // ==================== CHECK IF ENABLED ====================
  async isEnabled(): Promise<boolean> {
    try {
      const credentials = await this.getCredentials();
      return credentials !== null;
    } catch (error) {
      return false;
    }
  }

  // ==================== QUICK LOGIN ====================
  async quickLogin(): Promise<BiometricCredentials | null> {
    try {
      // Önce biometric authentication yap
      const authenticated = await this.authenticate('Hızlı giriş için kimliğinizi doğrulayın');
      if (!authenticated) {
        return null;
      }

      // Credentials'ı al
      const credentials = await this.getCredentials();
      return credentials;
    } catch (error) {
      console.error('❌ Quick login error:', error);
      return null;
    }
  }
}

// Singleton instance
export const biometricService = new BiometricService();
