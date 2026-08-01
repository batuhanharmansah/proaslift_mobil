// 🧭 NAVIGATION SERVICE
// Google Maps, Waze, Apple Maps entegrasyonu

import { Linking, Platform, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

interface NavigationOptions {
  latitude: number;
  longitude: number;
  address?: string;
  label?: string;
}

class NavigationService {
  // ==================== OPEN GOOGLE MAPS ====================
  async openGoogleMaps(options: NavigationOptions): Promise<void> {
    try {
      const { latitude, longitude, address, label } = options;
      const encodedAddress = address ? encodeURIComponent(address) : '';
      const encodedLabel = label ? encodeURIComponent(label) : '';
      
      // Google Maps URL formatı
      // https://www.google.com/maps/search/?api=1&query=lat,lng veya
      // https://www.google.com/maps/search/?api=1&query=address
      let url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      
      if (address && !latitude && !longitude) {
        url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
      } else if (encodedLabel) {
        url = `https://www.google.com/maps/search/?api=1&query=${encodedLabel}@${latitude},${longitude}`;
      }

      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        throw new Error('Google Maps açılamadı');
      }
    } catch (error: any) {
      console.error('❌ Open Google Maps error:', error);
      Alert.alert('Hata', 'Google Maps açılamadı. Lütfen cihazınızda Google Maps uygulamasının yüklü olduğundan emin olun.');
    }
  }

  // ==================== OPEN WAZE ====================
  async openWaze(options: NavigationOptions): Promise<void> {
    try {
      const { latitude, longitude, address } = options;
      
      // Waze URL formatı
      // waze://?ll=lat,lng&navigate=yes
      // veya address için: waze://?q=address
      let url = '';
      
      if (latitude && longitude) {
        url = `waze://?ll=${latitude},${longitude}&navigate=yes`;
      } else if (address) {
        const encodedAddress = encodeURIComponent(address);
        url = `waze://?q=${encodedAddress}&navigate=yes`;
      } else {
        throw new Error('Koordinat veya adres gerekli');
      }

      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Waze yüklü değilse, web versiyonunu aç
        const webUrl = `https://www.waze.com/ul?q=${latitude},${longitude}&navigate=yes`;
        await Linking.openURL(webUrl);
      }
    } catch (error: any) {
      console.error('❌ Open Waze error:', error);
      Alert.alert('Hata', 'Waze açılamadı. Lütfen cihazınızda Waze uygulamasının yüklü olduğundan emin olun.');
    }
  }

  // ==================== OPEN APPLE MAPS (iOS) ====================
  async openAppleMaps(options: NavigationOptions): Promise<void> {
    try {
      if (Platform.OS !== 'ios') {
        // iOS değilse Google Maps kullan
        return this.openGoogleMaps(options);
      }

      const { latitude, longitude, address } = options;
      
      // Apple Maps URL formatı
      // http://maps.apple.com/?daddr=lat,lng
      // veya address için: http://maps.apple.com/?daddr=address
      let url = '';
      
      if (latitude && longitude) {
        url = `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`;
      } else if (address) {
        const encodedAddress = encodeURIComponent(address);
        url = `http://maps.apple.com/?daddr=${encodedAddress}&dirflg=d`;
      } else {
        throw new Error('Koordinat veya adres gerekli');
      }

      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        throw new Error('Apple Maps açılamadı');
      }
    } catch (error: any) {
      console.error('❌ Open Apple Maps error:', error);
      // Fallback olarak Google Maps'i dene
      this.openGoogleMaps(options);
    }
  }

  // ==================== SHOW NAVIGATION OPTIONS ====================
  async showNavigationOptions(options: NavigationOptions): Promise<void> {
    const { address, label } = options;
    
    const buttons = [];
    
    // Google Maps
    buttons.push({
      text: 'Google Maps',
      onPress: () => this.openGoogleMaps(options),
    });
    
    // Waze
    buttons.push({
      text: 'Waze',
      onPress: () => this.openWaze(options),
    });
    
    // iOS'ta Apple Maps ekle
    if (Platform.OS === 'ios') {
      buttons.push({
        text: 'Apple Maps',
        onPress: () => this.openAppleMaps(options),
      });
    }
    
    // İptal butonu
    buttons.push({
      text: 'İptal',
      style: 'cancel',
    });

    Alert.alert(
      'Navigasyon',
      label || address || 'Konuma gitmek için bir uygulama seçin:',
      buttons
    );
  }

  // ==================== COPY ADDRESS TO CLIPBOARD ====================
  async copyAddress(address: string): Promise<boolean> {
    try {
      if (!address || address.trim().length === 0) {
        Alert.alert('Hata', 'Kopyalanacak adres bulunamadı');
        return false;
      }

      await Clipboard.setStringAsync(address);
      Alert.alert('Başarılı', 'Adres panoya kopyalandı');
      return true;
    } catch (error) {
      console.error('❌ Copy address error:', error);
      Alert.alert('Hata', 'Adres kopyalanamadı');
      return false;
    }
  }
}

// Singleton instance
export const navigationService = new NavigationService();
