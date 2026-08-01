// 🔔 ENTERPRISE PUSH NOTIFICATION SERVICE
// Push notification yönetimi - Expo Notifications entegrasyonu

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../../constants';

// Notification handler configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.EventSubscription | null = null;
  private responseListener: Notifications.EventSubscription | null = null;
  private lastSyncedToken: string | null = null;

  // ==================== INITIALIZATION ====================

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      await this.getExpoPushToken();
      await this.syncTokenWithBackend();
      this.setupNotificationListeners();
    } catch (error) {
      // ignore — bildirim isteğe bağlı
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      // Android specific: Create notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get Expo push token
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '2415558a-61ec-48ea-8926-1b430880b3c0',
      });
      this.expoPushToken = tokenData.data;
      return this.expoPushToken;
    } catch (error) {
      return null;
    }
  }

  /**
   * Setup notification listeners
   */
  private setupNotificationListeners(): void {
    this.cleanup();

    // Foreground notification handler
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      this.handleForegroundNotification(notification);
    });

    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Handle foreground notification
   */
  private handleForegroundNotification(notification: Notifications.Notification): void {
    // You can show a custom in-app notification here
    // For now, Expo will show the notification automatically
  }

  /**
   * Handle notification response (user tapped)
   */
  private handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): void {
    const data = response.notification.request.content.data as any;

    // Deep linking will be handled by AppNavigator or NotificationsScreen
    // Store notification data for navigation
    if (data?.screen) {
      // Navigation will be handled in NotificationsScreen or AppNavigator
    }
  }

  /**
   * Schedule local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: trigger || null, // null = immediate
      });

      return notificationId;
    } catch (error) {
      console.error('❌ Schedule local notification error:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('❌ Cancel notification error:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('❌ Cancel all notifications error:', error);
    }
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('❌ Get badge count error:', error);
      return 0;
    }
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('❌ Set badge count error:', error);
    }
  }

  /**
   * Clear badge
   */
  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('❌ Clear badge error:', error);
    }
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  /**
   * Get expo push token (for backend registration)
   */
  getToken(): string | null {
    return this.expoPushToken;
  }

  async unregisterCurrentDevice(): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.UNREGISTER_DEVICE_TOKEN, {
        data: {
          token: this.expoPushToken || undefined,
        },
      });
    } catch {
      // ignore
    }
  }

  private async syncTokenWithBackend(): Promise<void> {
    if (!this.expoPushToken) {
      return;
    }

    // Token değişmediyse tekrar POST atma (art arda initialize() çağrılarında gereksiz istek üretmesin)
    if (this.lastSyncedToken === this.expoPushToken) {
      return;
    }

    try {
      await apiClient.post(API_ENDPOINTS.REGISTER_DEVICE_TOKEN, {
        token: this.expoPushToken,
        platform: Platform.OS,
      });
      this.lastSyncedToken = this.expoPushToken;
    } catch {
      // ignore - push registration should not block app startup
    }
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationService();
