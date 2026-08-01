// 🎯 HAPTIC FEEDBACK UTILITY
// Dokunsal geri bildirim için yardımcı fonksiyonlar

import * as Haptics from 'expo-haptics';

export const hapticFeedback = {
  // Hafif titreşim
  light: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  },

  // Orta titreşim
  medium: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  },

  // Güçlü titreşim
  heavy: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  },

  // Başarı titreşimi
  success: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  },

  // Hata titreşimi
  error: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  },

  // Uyarı titreşimi
  warning: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  },

  // Seçim titreşimi
  selection: () => {
    try {
      Haptics.selectionAsync();
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  },
};

// Varsayılan haptic feedback
export default hapticFeedback;
