// 🔔 NOTIFICATION PREVIEW COMPONENT
// Dashboard'da son 5 bildirim, acil bildirimler için badge, direkt erişim

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { COLORS, DIMENSIONS, API_ENDPOINTS } from '../../constants';
import { apiClient } from '../../services/api/client';
import { NotificationItem } from '../../types';
import { formatTime, hapticFeedback } from '../../utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface NotificationPreviewProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
}

const NotificationPreview: React.FC<NotificationPreviewProps> = ({
  limit = 5,
  showHeader = true,
  compact = false,
}) => {
  // ==================== STATE ====================
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();

  // ==================== HANDLERS ====================
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      
      // Unread count'u ayrı API'den al (daha güvenilir)
      const [notificationsResponse, unreadCountResponse] = await Promise.all([
        apiClient.get(`${API_ENDPOINTS.NOTIFICATIONS}?per_page=${limit}&sort_by=created_at&sort_order=desc`),
        apiClient.get(API_ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT),
      ]);
      
      let allNotifications: NotificationItem[] = [];
      
      if (notificationsResponse?.success && notificationsResponse?.data) {
        const notificationsData = notificationsResponse.data;
        
        // Pagination response: { data: [...], current_page: 1, ... }
        // Direct array response: [...]
        if (Array.isArray(notificationsData)) {
          allNotifications = notificationsData;
        } else if (notificationsData?.data && Array.isArray(notificationsData.data)) {
          allNotifications = notificationsData.data;
        }
      } else if (Array.isArray(notificationsResponse)) {
        allNotifications = notificationsResponse;
      }
      
      // Unread count'u API'den al
      let unread = 0;
      if (unreadCountResponse?.success && unreadCountResponse?.data) {
        unread = unreadCountResponse.data.total_unread || 0;
      } else {
        // Fallback: local hesaplama
        unread = allNotifications.filter(n => !n.read).length;
      }
      
      if (allNotifications.length > 0) {
        const recentNotifications = allNotifications.slice(0, limit);
        setNotifications(recentNotifications);
        setUnreadCount(unread);
      } else {
        // No notifications
        setNotifications([]);
        setUnreadCount(unread); // Unread count'u yine de set et (başka yerden bildirim olabilir)
      }
    } catch (error) {
      console.error('❌ Fetch notifications error:', error);
      // Hata olsa bile boş array ile devam et
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // ==================== EFFECTS ====================
  // İlk yükleme
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Sayfa focus olduğunda yenile (bildirim sayfasından dönünce güncel olsun)
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  // Periyodik güncelleme (daha az sıklıkla - 2 dakika)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 120000); // 2 dakika
    
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleNotificationPress = useCallback(async (notification: NotificationItem) => {
    await hapticFeedback.light();
    
    // Bildirimi okundu olarak işaretle (eğer okunmamışsa)
    if (!notification.read) {
      try {
        const notificationId = typeof notification.id === 'string' 
          ? parseInt(notification.id) 
          : notification.id;
        
        // Optimistic update
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, read: true, read_at: new Date().toISOString() } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // API'ye gönder
        await apiClient.post(API_ENDPOINTS.MARK_NOTIFICATION_READ(notificationId));
        
        // Unread count'u yeniden fetch et (güncel olsun)
        try {
          const unreadCountResponse = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT);
          if (unreadCountResponse?.success && unreadCountResponse?.data) {
            setUnreadCount(unreadCountResponse.data.total_unread || 0);
          }
        } catch (error) {
          console.error('❌ Fetch unread count error:', error);
        }
      } catch (error) {
        console.error('❌ Mark notification as read error:', error);
        // Hata durumunda geri al (rollback)
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, read: false, read_at: undefined } : n
          )
        );
        setUnreadCount(prev => prev + 1);
      }
    }
    
    // Bildirim detayına git veya ilgili sayfaya yönlendir
    handleNotificationNavigation(notification);
  }, []);

  const handleNotificationNavigation = (notification: NotificationItem) => {
    // Bildirim tipine göre ilgili sayfaya yönlendir
    switch (notification.type) {
      case 'maintenance':
        if (notification.data?.maintenance_schedule_id) {
          navigation.navigate('ActiveJob', {
            maintenanceScheduleId: notification.data.maintenance_schedule_id,
            maintenanceSchedule: notification.data.maintenance_schedule || null,
          });
        }
        break;
      case 'issue':
        if (notification.data?.issue_id) {
          // Issue detail sayfasına git (eğer varsa)
          navigation.navigate('Notifications' as any);
        }
        break;
      default:
        // Varsayılan olarak bildirimler sayfasına git
        navigation.navigate('Notifications' as any);
        break;
    }
  };

  const handleViewAll = useCallback(() => {
    hapticFeedback.light();
    navigation.navigate('Notifications' as any);
  }, [navigation]);

  // ==================== RENDER HELPERS ====================
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'maintenance': return 'construct';
      case 'issue': return 'warning';
      case 'payment': return 'cash';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'maintenance': return COLORS.primary[500];
      case 'issue': return COLORS.error[500];
      case 'payment': return COLORS.warning[500];
      default: return COLORS.gray[500];
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critical': return COLORS.error[500];
      case 'high': return COLORS.warning[500];
      default: return COLORS.success[500];
    }
  };

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => {
    const isUrgent = item.priority === 'critical' || item.priority === 'high';
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.read && styles.notificationItemUnread,
          compact && styles.notificationItemCompact,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* Unread Indicator */}
        {!item.read && <View style={styles.unreadDot} />}
        
        {/* Icon */}
        <View
          style={[
            styles.notificationIcon,
            { backgroundColor: `${getNotificationColor(item.type)}20` },
            compact && styles.notificationIconCompact,
          ]}
        >
          <Ionicons
            name={getNotificationIcon(item.type)}
            size={compact ? 18 : 20}
            color={getNotificationColor(item.type)}
          />
        </View>
        
        {/* Content */}
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text
              style={[
                styles.notificationTitle,
                !item.read && styles.notificationTitleUnread,
                compact && styles.notificationTitleCompact,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            
            {isUrgent && (
              <View
                style={[
                  styles.urgentBadge,
                  { backgroundColor: getPriorityBadgeColor(item.priority) },
                ]}
              >
                <Text style={styles.urgentBadgeText}>
                  {item.priority === 'critical' ? 'ACİL' : 'ÖNEMLİ'}
                </Text>
              </View>
            )}
          </View>
          
          <Text
            style={[styles.notificationMessage, compact && styles.notificationMessageCompact]}
            numberOfLines={compact ? 1 : 2}
          >
            {item.body}
          </Text>
          
          {!compact && (
            <View style={styles.notificationFooter}>
              <Ionicons name="time-outline" size={12} color={COLORS.gray[500]} />
              <Text style={styles.notificationTime}>
                {formatTime(item.created_at)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ==================== RENDER ====================
  if (loading && notifications.length === 0) {
    return (
      <View style={styles.container}>
        {showHeader && (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Bildirimler</Text>
            <View style={styles.loadingIndicator} />
          </View>
        )}
      </View>
    );
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Bildirimler</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={handleViewAll}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>Tümünü Gör</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary[600]} />
          </TouchableOpacity>
        </View>
      )}
      
      <View style={[styles.notificationsList, compact && styles.notificationsListCompact]}>
        {notifications.map((item) => (
          <View key={item.id}>
            {renderNotificationItem({ item })}
          </View>
        ))}
      </View>
    </View>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  badge: {
    backgroundColor: COLORS.error[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: 'bold',
    color: 'white',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.primary[600],
  },
  notificationsList: {
    gap: 8,
  },
  notificationsListCompact: {
    gap: 4,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    position: 'relative',
  },
  notificationItemUnread: {
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: 8,
  },
  notificationItemCompact: {
    paddingVertical: 4,
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error[500],
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIconCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  notificationTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[700],
    flex: 1,
  },
  notificationTitleUnread: {
    fontWeight: '700',
    color: COLORS.gray[900],
  },
  notificationTitleCompact: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
  },
  urgentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  urgentBadgeText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: 'bold',
    color: 'white',
  },
  notificationMessage: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationMessageCompact: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    lineHeight: 16,
    marginBottom: 0,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notificationTime: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
  },
  loadingIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary[200],
    borderTopColor: COLORS.primary[600],
  },
});

export default NotificationPreview;
