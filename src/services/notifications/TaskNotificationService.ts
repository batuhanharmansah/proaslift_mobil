// 🔔 TASK NOTIFICATION SERVICE
// Acil işler için push notification gönderimi

import * as Notifications from 'expo-notifications';
import { Task, isTaskUrgent, isTaskToday } from '../../utils/taskUtils';

class TaskNotificationService {
  private scheduledNotifications: Set<string> = new Set();

  // ==================== REQUEST PERMISSIONS ====================
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Notification permission not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Request notification permissions error:', error);
      return false;
    }
  }

  // ==================== SCHEDULE URGENT TASK NOTIFICATION ====================
  async scheduleUrgentTaskNotification(task: Task): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return;
      }

      // Sadece acil işler için bildirim gönder
      if (!isTaskUrgent(task)) {
        return;
      }

      const taskId = `${task.id}`;
      
      // Eğer zaten planlanmışsa, tekrar planlama
      if (this.scheduledNotifications.has(taskId)) {
        await this.cancelTaskNotification(taskId);
      }

      // Bildirim içeriği
      const title = isTaskToday(task) 
        ? '🔥 Bugünün Acil İşi!'
        : '⚡ Yaklaşan Acil İş';
      
      const body = `${task.building_name || 'Bilinmeyen Bina'} - ${task.maintenance_type_label || 'Bakım'} işi için süre kısa!`;

      // Bildirim zamanlaması
      const scheduledDate = new Date(task.scheduled_date);
      
      // Eğer scheduled_time varsa, onu kullan
      if (task.scheduled_time) {
        const [hours, minutes] = task.scheduled_time.split(':').map(Number);
        scheduledDate.setHours(hours || 0, minutes || 0, 0, 0);
      }

      // Bildirimi iş zamanından 1 saat önce gönder
      const notificationTime = new Date(scheduledDate.getTime() - 60 * 60 * 1000);
      const now = new Date();

      // Eğer bildirim zamanı geçmişse, 15 dakika sonra gönder
      if (notificationTime <= now) {
        notificationTime.setTime(now.getTime() + 15 * 60 * 1000);
      }

      // Bildirimi planla (Expo trigger: type + date gerekli)
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: {
            taskId: task.id,
            type: 'urgent_task',
            scheduledDate: task.scheduled_date,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notificationTime,
        },
      });

      this.scheduledNotifications.add(taskId);

      // İş zamanı için de bir bildirim planla
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ İş Zamanı!',
          body: `${task.building_name || 'Bilinmeyen Bina'} - ${task.maintenance_type_label || 'Bakım'} işi başlama zamanı geldi.`,
          sound: true,
          data: {
            taskId: task.id,
            type: 'task_start',
            scheduledDate: task.scheduled_date,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: scheduledDate,
        },
      });

    } catch (error) {
      console.error('❌ Schedule urgent task notification error:', error);
    }
  }

  // ==================== SCHEDULE MULTIPLE URGENT TASKS ====================
  async scheduleUrgentTasksNotifications(tasks: Task[]): Promise<void> {
    try {
      const urgentTasks = tasks.filter(isTaskUrgent);
      
      for (const task of urgentTasks) {
        await this.scheduleUrgentTaskNotification(task);
      }

    } catch (error) {
      console.error('❌ Schedule urgent tasks notifications error:', error);
    }
  }

  // ==================== CANCEL TASK NOTIFICATION ====================
  async cancelTaskNotification(taskId: string): Promise<void> {
    try {
      // Planlanmış tüm bildirimleri al
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Bu işe ait bildirimleri iptal et
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.taskId === taskId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      this.scheduledNotifications.delete(taskId);
    } catch (error) {
      console.error('❌ Cancel task notification error:', error);
    }
  }

  // ==================== CANCEL ALL NOTIFICATIONS ====================
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.scheduledNotifications.clear();
    } catch (error) {
      console.error('❌ Cancel all notifications error:', error);
    }
  }

  // ==================== GET SCHEDULED NOTIFICATIONS ====================
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('❌ Get scheduled notifications error:', error);
      return [];
    }
  }
}

// Singleton instance
export const taskNotificationService = new TaskNotificationService();
