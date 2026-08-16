// 🔔 ENTERPRISE NOTIFICATIONS SCREEN
// Profesyonel bildirim yönetimi - API entegrasyonu, filtreleme, arama, deep linking

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, NotificationItem, NotificationUnreadCount } from '../../types';

// Hooks & Services
import { formatDate, hapticFeedback, debounce } from '../../utils';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import { COLORS, DIMENSIONS, API_ENDPOINTS } from '../../constants';
import { apiClient } from '../../services/api/client';
import { useAuth } from '../../store/authStore';
import { realtimeService } from '../../services/realtime/RealtimeService';
import { pushNotificationService } from '../../services/notifications/PushNotificationService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterType = 'all' | 'unread';
type NotificationType = 'all' | 'maintenance' | 'issue' | 'financial' | 'employee' | 'system' | 'general';
type PriorityType = 'all' | 'critical' | 'high' | 'medium' | 'low';

const NotificationsScreen: React.FC = () => {
  // ==================== STATE ====================
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<NotificationUnreadCount>({
    total_unread: 0,
    by_type: {},
    by_priority: {},
  });

  // Filters
  const [filterTab, setFilterTab] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });

  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  // ==================== EFFECTS ====================
  // Arama kutusuna debounce: her tuş vuruşunda değil, kullanıcı yazmayı bıraktıktan sonra tetiklenir
  const debouncedSetSearchQuery = useCallback(
    debounce((query: string) => {
      setDebouncedSearchQuery(query);
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSetSearchQuery(searchQuery);
  }, [searchQuery, debouncedSetSearchQuery]);

  useEffect(() => {
    fetchNotifications();
    // fetchUnreadCount buradan kasıtlı olarak çıkarıldı: sadece listeleme filtreleri/arama değiştiğinde
    // bildirim listesini yenilemek yeterli. Okunmamış sayaç ilk mount'ta ve odaklanmada (useFocusEffect)
    // ile okundu-işaretleme sonrası ayrıca güncelleniyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTab, typeFilter, priorityFilter, debouncedSearchQuery, pagination.current_page]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
      if (notifications.length === 0) {
        fetchNotifications();
      }
    }, [])
  );

  // Real-time notification updates
  useEffect(() => {
    const unsubscribe = realtimeService.on('notification.created', (event) => {
      // Add new notification to list
      if (event.data && typeof event.data === 'object') {
        const newNotification: NotificationItem = {
          id: event.data.id || Date.now(),
          title: event.data.title || 'Yeni Bildirim',
          body: event.data.body || event.data.message || '',
          type: event.data.type || 'general',
          type_label: event.data.type_label || 'Genel',
          priority: event.data.priority || 'medium',
          priority_label: event.data.priority_label || 'Orta',
          data: event.data.data,
          related_entity_type: event.data.related_entity_type,
          related_entity_id: event.data.related_entity_id,
          read: false,
          created_at: event.data.created_at || new Date().toISOString(),
          updated_at: event.data.updated_at || new Date().toISOString(),
        };

        setNotifications((prev) => [newNotification, ...prev]);
        fetchUnreadCount();
        
        // Update badge count
        pushNotificationService.setBadgeCount(unreadCount.total_unread + 1);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [unreadCount.total_unread]);

  // Update badge count when unread count changes
  useEffect(() => {
    pushNotificationService.setBadgeCount(unreadCount.total_unread);
  }, [unreadCount.total_unread]);

  // ==================== API CALLS ====================
  const fetchNotifications = useCallback(async () => {
    try {
      if (pagination.current_page === 1) {
        setLoading(true);
      }

      const params = new URLSearchParams();
      if (filterTab === 'unread') {
        params.append('read', 'false');
      }
      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }
      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      params.append('page', pagination.current_page.toString());
      params.append('per_page', pagination.per_page.toString());
      params.append('sort_by', 'created_at');
      params.append('sort_order', 'desc');

      const response = await apiClient.get(`${API_ENDPOINTS.NOTIFICATIONS}?${params.toString()}`);

      if (response?.success && response?.data) {
        const notificationsData = response.data;
        
        // Pagination response: { data: [...], current_page: 1, ... }
        // Direct array response: [...]
        let notificationsList: NotificationItem[] = [];
        
        if (Array.isArray(notificationsData)) {
          // Direct array response
          notificationsList = notificationsData;
        } else if (notificationsData?.data && Array.isArray(notificationsData.data)) {
          // Pagination response
          notificationsList = notificationsData.data;

          // Update pagination
          if (notificationsData.current_page) {
            setPagination({
              current_page: notificationsData.current_page,
              last_page: notificationsData.last_page || 1,
              per_page: notificationsData.per_page || 20,
              total: notificationsData.total ?? 0,
            });
          }
        } else if (Array.isArray(notificationsData)) {
          notificationsList = notificationsData;
        }

        if (Array.isArray(notificationsList) && notificationsList.length > 0) {
          if (pagination.current_page === 1) {
            setNotifications(notificationsList);
          } else {
            setNotifications((prev) => {
              const updated = [...prev, ...notificationsList];
              return updated;
            });
          }
        } else {
          console.warn('⚠️ NotificationsScreen: notificationsList is empty or not an array', {
            isArray: Array.isArray(notificationsList),
            length: notificationsList?.length,
          });
          if (pagination.current_page === 1) {
            setNotifications([]);
          }
        }
      } else if (Array.isArray(response)) {
        // Direct array response (fallback)
        if (pagination.current_page === 1) {
          setNotifications(response);
        } else {
          setNotifications((prev) => [...prev, ...response]);
        }
      } else {
        // No data
        console.warn('⚠️ NotificationsScreen: No valid data in response');
        if (pagination.current_page === 1) {
          setNotifications([]);
        }
      }
    } catch (error: any) {
      console.error('❌ NotificationsScreen: Fetch error', error);
      Alert.alert('Hata', 'Bildirimler yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterTab, typeFilter, priorityFilter, searchQuery, pagination.current_page, pagination.per_page]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT);
      // apiClient zaten response.data'yı unwrap eder: { success, data: { total_unread, ... } }
      const data = response?.data ?? response;
      const total = data?.total ?? 0;
      const unread = Math.min(data?.total_unread ?? 0, total > 0 ? total : (data?.total_unread ?? 0));
      setUnreadCount({
        total,
        total_unread: unread,
        by_type: data?.by_type ?? {},
        by_priority: data?.by_priority ?? {},
      });
    } catch (error: any) {
      console.error('❌ NotificationsScreen: Unread count error', error);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPagination({ ...pagination, current_page: 1 });
    await hapticFeedback.light();
    await Promise.all([fetchNotifications(), fetchUnreadCount()]);
  }, [fetchNotifications, fetchUnreadCount, pagination]);

  const handleLoadMore = useCallback(() => {
    if (!loading && pagination.current_page < pagination.last_page) {
      setPagination({ ...pagination, current_page: pagination.current_page + 1 });
    }
  }, [loading, pagination]);

  // ==================== NOTIFICATION ACTIONS ====================
  const handleNotificationPress = useCallback((notification: NotificationItem) => {
    hapticFeedback.light();

    // Optimistic: UI'ı hemen güncelle, API'yi arka planda çağır
    if (!notification.read) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => ({
        ...prev,
        total_unread: Math.max(0, prev.total_unread - 1),
      }));
      apiClient.post(API_ENDPOINTS.MARK_NOTIFICATION_READ(notification.id))
        .catch((error) => console.error('Mark as read error:', error));
    }

    // Deep linking
    if (notification.data?.screen) {
      const screen = notification.data.screen as keyof RootStackParamList;
      const params = notification.data.params || {};
      try {
        navigation.navigate(screen, params as any);
      } catch (error) {
        console.error('Navigation error:', error);
        Alert.alert('Bildirim', notification.body);
      }
    } else {
      Alert.alert(notification.title, notification.body);
    }
  }, [navigation]);

  const handleMarkAllAsRead = useCallback(async () => {
    hapticFeedback.medium();
    Alert.alert(
      'Tümünü Okundu İşaretle',
      'Tüm bildirimleri okundu olarak işaretlemek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          onPress: async () => {
            try {
              await apiClient.post(API_ENDPOINTS.MARK_ALL_NOTIFICATIONS_READ);
              setNotifications((prev) =>
                prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
              );
              fetchUnreadCount();
              hapticFeedback.success();
            } catch (error: any) {
              Alert.alert('Hata', 'Bildirimler güncellenemedi: ' + (error.message || 'Bilinmeyen hata'));
            }
          },
        },
      ]
    );
  }, [fetchUnreadCount]);

  const handleDeleteRead = useCallback(async () => {
    hapticFeedback.medium();
    Alert.alert(
      'Okunmuş Bildirimleri Sil',
      'Tüm okunmuş bildirimleri silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(API_ENDPOINTS.DELETE_READ_NOTIFICATIONS);
              setNotifications((prev) => prev.filter((n) => !n.read));
              hapticFeedback.success();
            } catch (error: any) {
              Alert.alert('Hata', 'Bildirimler silinemedi: ' + (error.message || 'Bilinmeyen hata'));
            }
          },
        },
      ]
    );
  }, []);

  // ==================== RENDER METHODS ====================
  const renderHeader = () => (
    <View style={styles.header}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title={unreadCount.total_unread > 0 ? `Bildirimler (${unreadCount.total_unread})` : 'Bildirimler'}
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
        rightElement={
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="filter" size={24} color="white" />
          </TouchableOpacity>
        }
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.gray[500]} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Bildirimlerde ara..."
          placeholderTextColor={COLORS.gray[500]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray[500]} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderTabs = () => (
    <View>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, filterTab === 'all' && styles.tabActive]}
          onPress={() => {
            setFilterTab('all');
            setPagination({ ...pagination, current_page: 1 });
            hapticFeedback.light();
          }}
        >
          <Text style={[styles.tabText, filterTab === 'all' && styles.tabTextActive]}>
            Tümü ({pagination.total || notifications.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, filterTab === 'unread' && styles.tabActive]}
          onPress={() => {
            setFilterTab('unread');
            setPagination({ ...pagination, current_page: 1 });
            hapticFeedback.light();
          }}
        >
          <View style={styles.tabWithBadge}>
            <Text style={[styles.tabText, filterTab === 'unread' && styles.tabTextActive]}>
              Okunmamış
            </Text>
            {unreadCount.total_unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount.total_unread}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {unreadCount.total_unread > 0 && (
        <TouchableOpacity style={styles.markAllReadBar} onPress={handleMarkAllAsRead}>
          <Ionicons name="checkmark-done" size={16} color={COLORS.primary[600]} />
          <Text style={styles.markAllReadText}>
            Tümünü Okundu İşaretle ({unreadCount.total_unread})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <View style={styles.filtersContainer}>
        {/* Type Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Kategori</Text>
          <View style={styles.filterChips}>
            {(['all', 'maintenance', 'issue', 'financial', 'employee', 'system', 'general'] as NotificationType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  typeFilter === type && styles.filterChipActive,
                ]}
                onPress={() => {
                  setTypeFilter(type);
                  setPagination({ ...pagination, current_page: 1 });
                  hapticFeedback.light();
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    typeFilter === type && styles.filterChipTextActive,
                  ]}
                >
                  {type === 'all' ? 'Tümü' : getTypeLabel(type)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Priority Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Öncelik</Text>
          <View style={styles.filterChips}>
            {(['all', 'critical', 'high', 'medium', 'low'] as PriorityType[]).map((priority) => (
              <TouchableOpacity
                key={priority}
                style={[
                  styles.filterChip,
                  priorityFilter === priority && styles.filterChipActive,
                ]}
                onPress={() => {
                  setPriorityFilter(priority);
                  setPagination({ ...pagination, current_page: 1 });
                  hapticFeedback.light();
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    priorityFilter === priority && styles.filterChipTextActive,
                  ]}
                >
                  {priority === 'all' ? 'Tümü' : getPriorityLabel(priority)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const getTypeLabel = (type: NotificationType): string => {
    const labels: Record<string, string> = {
      maintenance: 'Bakım',
      issue: 'Arıza',
      financial: 'Finansal',
      employee: 'Personel',
      system: 'Sistem',
      general: 'Genel',
    };
    return labels[type] || type;
  };

  const getPriorityLabel = (priority: PriorityType): string => {
    const labels: Record<string, string> = {
      critical: 'Kritik',
      high: 'Yüksek',
      medium: 'Orta',
      low: 'Düşük',
    };
    return labels[priority] || priority;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'maintenance':
        return 'construct';
      case 'issue':
        return 'warning';
      case 'financial':
        return 'cash';
      case 'employee':
        return 'person';
      case 'system':
        return 'settings';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'maintenance':
        return COLORS.primary[500];
      case 'issue':
        return COLORS.error[500];
      case 'financial':
        return COLORS.warning[500];
      case 'employee':
        return COLORS.blue[500];
      case 'system':
        return COLORS.gray[500];
      default:
        return COLORS.gray[500];
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return COLORS.error[500];
      case 'high':
        return COLORS.warning[500];
      case 'medium':
        return COLORS.blue[500];
      case 'low':
        return COLORS.gray[400];
      default:
        return COLORS.gray[400];
    }
  };

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.notificationCardUnread]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      {!item.read && <View style={styles.unreadIndicator} />}

      <View
        style={[
          styles.notificationIcon,
          { backgroundColor: `${getNotificationColor(item.type)}20` },
        ]}
      >
        <Ionicons
          name={getNotificationIcon(item.type)}
          size={24}
          color={getNotificationColor(item.type)}
        />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text
            style={[styles.notificationTitle, !item.read && styles.notificationTitleUnread]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {item.priority === 'critical' && (
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
              <Text style={styles.priorityBadgeText}>KRİTİK</Text>
            </View>
          )}
        </View>

        <Text style={styles.notificationBody} numberOfLines={2}>
          {item.body}
        </Text>

        <View style={styles.notificationFooter}>
          <Ionicons name="time-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.notificationTime}>
            {formatDate(item.created_at, 'relative')}
          </Text>
          {item.type_label && (
            <>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.notificationType}>{item.type_label}</Text>
            </>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off-outline" size={64} color={COLORS.gray[300]} />
      <Text style={styles.emptyTitle}>
        {filterTab === 'all' ? 'Bildirim Yok' : 'Okunmamış Bildirim Yok'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {filterTab === 'all'
          ? 'Henüz bildirim bulunmuyor'
          : 'Tüm bildirimler okundu'}
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (loading && pagination.current_page > 1) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={COLORS.primary[500]} />
        </View>
      );
    }
    return null;
  };

  // ==================== MAIN RENDER ====================
  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Bildirimler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderTabs()}
      {renderFilters()}

      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary[500]]}
            tintColor={COLORS.primary[500]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      {/* Action Buttons */}
      {notifications.some((n) => n.read) && (
        <View style={styles.bottomActions}>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDeleteRead}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error[500]} />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
              Okunmuşları Sil
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    backgroundColor: COLORS.primary[600],
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[200],
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[900],
  },
  clearSearchButton: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
  },
  markAllReadBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary[50],
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary[100],
  },
  markAllReadText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.primary[600],
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary[600],
  },
  tabText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '500',
    color: COLORS.gray[600],
  },
  tabTextActive: {
    color: COLORS.primary[600],
    fontWeight: '700',
  },
  tabWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    backgroundColor: COLORS.error[500],
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: 'bold',
  },
  filtersContainer: {
    backgroundColor: 'white',
    padding: DIMENSIONS.SCREEN_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.gray[100],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  filterChipActive: {
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[500],
  },
  filterChipText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[700],
  },
  filterChipTextActive: {
    color: COLORS.primary[600],
    fontWeight: '600',
  },
  listContainer: {
    padding: DIMENSIONS.SCREEN_PADDING,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  notificationCardUnread: {
    backgroundColor: COLORS.primary[50],
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary[500],
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error[500],
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
    flex: 1,
  },
  notificationTitleUnread: {
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  priorityBadgeText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: 'bold',
    color: 'white',
  },
  notificationBody: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[700],
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
    marginLeft: 4,
  },
  separator: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[400],
    marginHorizontal: 6,
  },
  notificationType: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
  },
  bottomActions: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary[50],
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    gap: 6,
  },
  actionButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.primary[500],
  },
  deleteButton: {
    backgroundColor: COLORS.error[50],
  },
  deleteButtonText: {
    color: COLORS.error[500],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[600],
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
});

export default NotificationsScreen;
