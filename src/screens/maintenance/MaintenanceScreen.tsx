// 🔧 ENTERPRISE MAINTENANCE SCREEN
// Bakım takvimi, planlama, takip sistemi
// Sadece çalışana atanan işleri gösterir

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  SafeAreaView,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import { apiClient, isRequestCancelled } from '../../services/api/client';
import { API_ENDPOINTS } from '../../constants';
import { MaintenanceSchedule } from '../../types';

// Hooks & Services
import { formatDate, hapticFeedback, debounce } from '../../utils';
import { COLORS, DIMENSIONS } from '../../constants';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../store/authStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type MaintenanceRouteProp = RouteProp<RootStackParamList, 'Maintenance'>;

const MaintenanceScreen: React.FC = () => {
  const route = useRoute<MaintenanceRouteProp>();
  const initialTab = route.params?.initialTab;

  // ==================== STATE ====================
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'planned' | 'completed' | 'overdue'>(
    initialTab ?? 'planned'
  );
  const [maintenances, setMaintenances] = useState<MaintenanceSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Admin için filtreleme state'leri
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Görünüm: liste / takvim
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [calendarData, setCalendarData] = useState<{ date: string; count: number; maintenances: any[] }[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedDayModal, setSelectedDayModal] = useState<{ date: string; maintenances: any[] } | null>(null);

  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();
  const { isEmployee } = useAuth();

  // ==================== LOAD DATA ====================
  const loadMaintenances = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);

      // Admin ve çalışan: planlı (gelecek tarih) işler ilk sayfada gelsin diye tarihe göre desc
      const params: any = {
        per_page: 200,
        sort_by: 'scheduled_date',
        sort_order: 'desc',
      };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const response = await apiClient.get(API_ENDPOINTS.MAINTENANCE_SCHEDULES, { params, signal }) as any;

      if (signal?.aborted) return;

      // apiClient.get() body döndürüyor: { data: [...], pagination: {...}, success: true }
      const responseData = response?.data ?? (Array.isArray(response) ? response : []);
      let data = Array.isArray(responseData) ? responseData : [];

      // Arama filtresi (sadece admin için)
      if (!isEmployee && debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        data = data.filter((m: MaintenanceSchedule) =>
          m.building?.name?.toLowerCase().includes(query) ||
          m.maintenance_type_label?.toLowerCase().includes(query) ||
          m.assigned_employee?.full_name?.toLowerCase().includes(query)
        );
      }

      setMaintenances(data);
    } catch (err: any) {
      if (isRequestCancelled(err)) return;
      console.error('❌ Load maintenances error:', err);
      setError(err.message || 'Bakım listesi yüklenemedi');
      setMaintenances([]);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [isEmployee, statusFilter, priorityFilter, debouncedSearchQuery]);

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

  // Dashboard'dan initialTab ile gelindiğinde seçili tab'ı ayarla
  useEffect(() => {
    if (initialTab && ['planned', 'completed', 'overdue'].includes(initialTab)) {
      setSelectedTab(initialTab);
    }
  }, [initialTab]);

  // ==================== FOCUS EFFECT ====================
  // loadMaintenances, statusFilter/priorityFilter/debouncedSearchQuery değiştiğinde yeniden oluşuyor;
  // ekran odaklıyken bu useFocusEffect otomatik olarak yeniden tetiklenir (react-navigation davranışı).
  // Bu yüzden filtre değişimi için ayrıca bir useEffect'e gerek yok — aksi halde aynı istek 2 kez atılırdı.
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      loadMaintenances(controller.signal);
      return () => controller.abort();
    }, [loadMaintenances])
  );

  // Takvim verisi (ay değişince)
  const loadCalendar = useCallback(async () => {
    if (viewMode !== 'calendar') return;
    const start = new Date(calendarMonth.year, calendarMonth.month, 1);
    const end = new Date(calendarMonth.year, calendarMonth.month + 1, 0);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    try {
      setCalendarLoading(true);
      const res = await apiClient.get(API_ENDPOINTS.MAINTENANCE_CALENDAR, {
        params: { start_date: startStr, end_date: endStr },
      }) as any;
      const list = Array.isArray(res?.data) ? res.data : res?.data?.data ?? [];
      setCalendarData(list);
    } catch {
      setCalendarData([]);
    } finally {
      setCalendarLoading(false);
    }
  }, [viewMode, calendarMonth.year, calendarMonth.month]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  // ==================== HELPERS: Tarih ve status (timezone-safe, case-insensitive) ====================
  const getTodayYmd = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  // scheduled_date'i cihazın yerel tarihine göre YYYY-MM-DD yap (UTC değil)
  const getScheduledYmd = (m: MaintenanceSchedule): string => {
    const raw = m.scheduled_date;
    if (!raw) return '';
    const d = typeof raw === 'string' ? new Date(raw) : new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const getStatus = (m: MaintenanceSchedule): string =>
    (m.status || '').toLowerCase();
  const isPlannedStatus = (s: string) =>
    ['planli', 'atandi', 'baslandi'].includes(s);

  // ==================== COMPUTED ====================
  const todayYmd = getTodayYmd();
  const filteredMaintenances = maintenances.filter((m) => {
    const status = getStatus(m);
    const scheduledYmd = getScheduledYmd(m);

    if (selectedTab === 'planned') {
      return isPlannedStatus(status) && scheduledYmd >= todayYmd;
    }
    if (selectedTab === 'completed') {
      return status === 'tamamlandi';
    }
    if (selectedTab === 'overdue') {
      return isPlannedStatus(status) && scheduledYmd < todayYmd;
    }
    return false;
  });

  const stats = {
    planned: maintenances.filter((m) =>
      isPlannedStatus(getStatus(m)) && getScheduledYmd(m) >= todayYmd
    ).length,
    completed: maintenances.filter((m) => getStatus(m) === 'tamamlandi').length,
    overdue: maintenances.filter((m) =>
      isPlannedStatus(getStatus(m)) && getScheduledYmd(m) < todayYmd
    ).length,
  };

  // ==================== HANDLERS ====================
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await loadMaintenances();
    setRefreshing(false);
  }, [loadMaintenances]);

  const handleMaintenancePress = useCallback(
    (maintenance: MaintenanceSchedule) => {
      hapticFeedback.light();

      if (isEmployee) {
        // Çalışan için: Direkt detay sayfasına git
        navigation.navigate('ActiveJob' as any, {
          maintenanceScheduleId: maintenance.id,
          maintenanceSchedule: maintenance,
        });
      } else {
        // Admin için: Seçenekler göster
        Alert.alert(
          maintenance.building?.name || 'Bilinmeyen Bina',
          `${maintenance.maintenance_type_label || maintenance.maintenance_type}\n${
            maintenance.building?.elevator_code || 'Kod yok'
          }\nTarih: ${formatDate(maintenance.scheduled_date)}\n${
            maintenance.assigned_employee?.full_name || 'Atanmamış'
          }`,
          [
            {
              text: 'Detay Gör',
              onPress: () => {
                hapticFeedback.light();
                navigation.navigate('MaintenanceDetail', {
                  maintenanceId: maintenance.id,
                });
              },
            },
            {
              text: 'Düzenle',
              onPress: () => {
                hapticFeedback.light();
                navigation.navigate('MaintenanceEdit', {
                  maintenanceId: maintenance.id,
                });
              },
            },
            {
              text: 'Tamam',
              style: 'cancel',
            },
          ]
        );
      }
    },
    [navigation, isEmployee]
  );

  // ==================== RENDER METHODS ====================
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setSidebarVisible(true)}
        >
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Bakım Takvimi</Text>
          <Text style={styles.headerSubtitle}>
            {stats.planned} Planlı • {stats.overdue} Gecikmiş
            {!isEmployee && ` • ${stats.completed} Tamamlanan`}
          </Text>
        </View>
      </View>

      {/* Liste / Takvim toggle - Admin için */}
      {!isEmployee && (
        <View style={styles.viewModeRow}>
          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeBtnActive]}
            onPress={() => { setViewMode('list'); hapticFeedback.light(); }}
          >
            <Ionicons name="list" size={18} color={viewMode === 'list' ? COLORS.white : COLORS.primary[200]} />
            <Text style={[styles.viewModeBtnText, viewMode === 'list' && styles.viewModeBtnTextActive]}>Liste</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'calendar' && styles.viewModeBtnActive]}
            onPress={() => { setViewMode('calendar'); hapticFeedback.light(); }}
          >
            <Ionicons name="calendar" size={18} color={viewMode === 'calendar' ? COLORS.white : COLORS.primary[200]} />
            <Text style={[styles.viewModeBtnText, viewMode === 'calendar' && styles.viewModeBtnTextActive]}>Takvim</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Admin için arama ve filtreleme */}
      {!isEmployee && (
        <View style={styles.adminControls}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.gray[500]} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Bina, tip veya personel ara..."
              placeholderTextColor={COLORS.gray[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.gray[500]} />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="filter" size={20} color="white" />
            <Text style={styles.filterButtonText}>Filtrele</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Filtre seçenekleri */}
      {!isEmployee && showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Durum:</Text>
            <View style={styles.filterChips}>
              {['planli', 'atandi', 'baslandi', 'tamamlandi'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    statusFilter === status && styles.filterChipActive,
                  ]}
                  onPress={() => setStatusFilter(statusFilter === status ? null : status)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === status && styles.filterChipTextActive,
                    ]}
                  >
                    {status === 'planli' ? 'Planlı' : status === 'atandi' ? 'Atandı' : status === 'baslandi' ? 'Başlandı' : 'Tamamlandı'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Öncelik:</Text>
            <View style={styles.filterChips}>
              {['acil', 'yuksek', 'normal', 'dusuk'].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.filterChip,
                    priorityFilter === priority && styles.filterChipActive,
                  ]}
                  onPress={() => setPriorityFilter(priorityFilter === priority ? null : priority)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      priorityFilter === priority && styles.filterChipTextActive,
                    ]}
                  >
                    {getPriorityLabel(priority)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'planned' && styles.tabActive]}
        onPress={() => {
          setSelectedTab('planned');
          hapticFeedback.light();
        }}
      >
        <Text
          style={[styles.tabText, selectedTab === 'planned' && styles.tabTextActive]}
        >
          Planlı ({stats.planned})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedTab === 'completed' && styles.tabActive]}
        onPress={() => {
          setSelectedTab('completed');
          hapticFeedback.light();
        }}
      >
        <Text
          style={[styles.tabText, selectedTab === 'completed' && styles.tabTextActive]}
        >
          Tamamlanan ({stats.completed})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedTab === 'overdue' && styles.tabActive]}
        onPress={() => {
          setSelectedTab('overdue');
          hapticFeedback.light();
        }}
      >
        <Text
          style={[styles.tabText, selectedTab === 'overdue' && styles.tabTextActive]}
        >
          Gecikmiş ({stats.overdue})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'acil':
        return COLORS.error[500];
      case 'yuksek':
        return COLORS.warning[500];
      default:
        return COLORS.success[500];
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'acil':
        return 'Acil';
      case 'yuksek':
        return 'Yüksek';
      case 'normal':
        return 'Normal';
      case 'dusuk':
        return 'Düşük';
      default:
        return 'Normal';
    }
  };

  const renderMaintenanceItem = ({ item }: { item: MaintenanceSchedule }) => (
    <TouchableOpacity
      style={styles.maintenanceCard}
      onPress={() => handleMaintenancePress(item)}
      activeOpacity={0.7}
    >
      {/* Priority Indicator */}
      <View
        style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(item.priority || 'normal') }]}
      />

      <View style={styles.maintenanceContent}>
        {/* Header */}
        <View style={styles.maintenanceHeader}>
          <View style={styles.maintenanceTitleSection}>
            <Text style={styles.buildingName}>
              {item.building?.name || 'Bilinmeyen Bina'}
            </Text>
            <Text style={styles.elevatorCode}>
              {item.building?.elevator_code || 'Kod yok'}
            </Text>
          </View>

          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: `${getPriorityColor(item.priority || 'normal')}20` },
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                { color: getPriorityColor(item.priority || 'normal') },
              ]}
            >
              {getPriorityLabel(item.priority || 'normal')}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.maintenanceDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color={COLORS.gray[500]} />
            <Text style={styles.detailText}>{formatDate(item.scheduled_date)}</Text>
          </View>

          {item.assigned_employee && (
            <View style={styles.detailRow}>
              <Ionicons name="person" size={16} color={COLORS.gray[500]} />
              <Text style={styles.detailText}>
                {item.assigned_employee.full_name || 'Atanmamış'}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="construct" size={16} color={COLORS.gray[500]} />
            <Text style={styles.detailText}>
              {item.maintenance_type_label || item.maintenance_type}
            </Text>
          </View>

          {((item as any).maintenance_report?.approval_status === 'onay_bekliyor') && (
            <View style={styles.approvalBadge}>
              <Ionicons name="time-outline" size={14} color={COLORS.warning[700]} />
              <Text style={styles.approvalBadgeText}>
                {(item as any).maintenance_report?.approval_status_label || 'Onay Bekleniyor'}
              </Text>
            </View>
          )}
        </View>
        
        {/* Çalışan için hızlı aksiyonlar */}
        {isEmployee && item.status !== 'tamamlandi' && (
          <View style={styles.quickActions}>
            {item.status === 'planli' || item.status === 'atandi' ? (
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={async (e) => {
                  e.stopPropagation();
                  hapticFeedback.light();
                  try {
                    const res = await apiClient.post(API_ENDPOINTS.MAINTENANCE_START(item.id)) as any;
                    if (res?.success !== false) {
                      hapticFeedback.success();
                      navigation.navigate('ActiveJob' as any, {
                        maintenanceScheduleId: item.id,
                        maintenanceSchedule: { ...item, status: res?.data?.status ?? 'baslandi', status_label: res?.data?.status_label ?? 'Başlandı' },
                      });
                    } else {
                      Alert.alert('Hata', res?.message ?? 'İş başlatılamadı.');
                    }
                  } catch (err: any) {
                    Alert.alert('Hata', err?.response?.data?.message ?? err?.message ?? 'İş başlatılamadı.');
                  }
                }}
              >
                <Ionicons name="play" size={16} color={COLORS.success[600]} />
                <Text style={styles.quickActionText}>Başlat</Text>
              </TouchableOpacity>
            ) : item.status === 'baslandi' || item.status === 'tamamlandi' ? (
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: (item as any).maintenance_report ? COLORS.success[50] : COLORS.primary[50] }]}
                onPress={(e) => {
                  e.stopPropagation();
                  hapticFeedback.light();
                  const report = (item as any).maintenance_report;
                  if (report) {
                    navigation.navigate('MaintenanceReportDetail' as any, {
                      maintenanceSchedule: item,
                      maintenanceReport: report,
                    });
                  } else {
                    navigation.navigate('ActiveJob' as any, {
                      maintenanceScheduleId: item.id,
                      maintenanceSchedule: item,
                    });
                  }
                }}
              >
                <Ionicons name={(item as any).maintenance_report ? 'eye' : 'document-text'} size={16} color={(item as any).maintenance_report ? COLORS.success[600] : COLORS.primary[600]} />
                <Text style={[styles.quickActionText, { color: (item as any).maintenance_report ? COLORS.success[600] : COLORS.primary[600] }]}>
                  {(item as any).maintenance_report ? 'Raporu Görüntüle' : 'Rapor Oluştur'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color={COLORS.gray[300]} />
      <Text style={styles.emptyTitle}>
        {selectedTab === 'planned' && 'Planlı Bakım Yok'}
        {selectedTab === 'completed' && 'Tamamlanan Bakım Yok'}
        {selectedTab === 'overdue' && 'Gecikmiş Bakım Yok'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {selectedTab === 'planned' && 'Henüz bakım planlanmamış'}
        {selectedTab === 'completed' && 'Tamamlanmış bakım kaydı bulunmuyor'}
        {selectedTab === 'overdue' && 'Gecikmiş bakım bulunmuyor'}
      </Text>
    </View>
  );

  // ==================== MAIN RENDER ====================
  return (
    <SafeAreaView style={styles.container}>
      <CustomSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />

      {renderHeader()}
      
      {/* Admin için istatistikler kartı */}
      {!isEmployee && (
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{maintenances.length}</Text>
              <Text style={styles.statLabel}>Toplam İş</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.primary[600] }]}>
                {stats.planned}
              </Text>
              <Text style={styles.statLabel}>Planlı</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.success[600] }]}>
                {stats.completed}
              </Text>
              <Text style={styles.statLabel}>Tamamlanan</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.error[600] }]}>
                {stats.overdue}
              </Text>
              <Text style={styles.statLabel}>Gecikmiş</Text>
            </View>
          </View>
        </View>
      )}
      
      {viewMode === 'list' && renderTabs()}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {viewMode === 'calendar' ? (
        <>
          <View style={styles.calendarSection}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={() => {
                  const d = new Date(calendarMonth.year, calendarMonth.month - 1);
                  setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
                }}
                style={styles.calendarNavBtn}
              >
                <Ionicons name="chevron-back" size={24} color={COLORS.gray[700]} />
              </TouchableOpacity>
              <Text style={styles.calendarMonthTitle}>
                {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const d = new Date(calendarMonth.year, calendarMonth.month + 1);
                  setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
                }}
                style={styles.calendarNavBtn}
              >
                <Ionicons name="chevron-forward" size={24} color={COLORS.gray[700]} />
              </TouchableOpacity>
            </View>
            <View style={styles.weekDayRow}>
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => (
                <Text key={day} style={styles.weekDayText}>{day}</Text>
              ))}
            </View>
            {calendarLoading ? (
              <View style={styles.calendarLoading}><Text style={styles.loadingText}>Yükleniyor...</Text></View>
            ) : (
              <View style={styles.calendarGrid}>
                {(() => {
                  const first = new Date(calendarMonth.year, calendarMonth.month, 1);
                  const last = new Date(calendarMonth.year, calendarMonth.month + 1, 0);
                  const startPad = (first.getDay() + 6) % 7;
                  const daysInMonth = last.getDate();
                  const cells: { date: string; day: number; isCurrent: boolean }[] = [];
                  for (let i = 0; i < startPad; i++) cells.push({ date: '', day: 0, isCurrent: false });
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    cells.push({ date: dateStr, day: d, isCurrent: true });
                  }
                  const byDate = Object.fromEntries((calendarData || []).map((x) => [x.date, x]));
                  return cells.map((cell, idx) => {
                    const info = cell.date ? byDate[cell.date] : null;
                    const count = info?.count ?? 0;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.calendarDay, !cell.isCurrent && styles.calendarDayOther]}
                        onPress={() => {
                          if (!cell.date) return;
                          const maintenances = info?.maintenances ?? [];
                          setSelectedDayModal({ date: cell.date, maintenances });
                        }}
                      >
                        <Text style={[styles.calendarDayNum, !cell.isCurrent && styles.calendarDayNumOther]}>{cell.day || ''}</Text>
                        {count > 0 && (
                          <View style={styles.calendarDayBadge}>
                            <Text style={styles.calendarDayBadgeText}>{count}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  });
                })()}
              </View>
            )}
          </View>

          <Modal visible={!!selectedDayModal} transparent animationType="fade">
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSelectedDayModal(null)}>
              <View style={styles.dayModalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.dayModalHeader}>
                  <Text style={styles.dayModalTitle}>
                    {selectedDayModal?.date ? formatDate(selectedDayModal.date) : ''}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedDayModal(null)}>
                    <Ionicons name="close" size={28} color={COLORS.gray[700]} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.dayModalScroll}>
                  {(selectedDayModal?.maintenances ?? []).length === 0 ? (
                    <Text style={styles.dayModalEmpty}>Bu güne ait bakım yok</Text>
                  ) : (
                    (selectedDayModal?.maintenances ?? []).map((m: any) => (
                      <TouchableOpacity
                        key={m.id}
                        style={styles.dayModalItem}
                        onPress={() => {
                          setSelectedDayModal(null);
                          navigation.navigate('MaintenanceDetail', { maintenanceId: m.id });
                        }}
                      >
                        <Text style={styles.dayModalItemTitle}>{m.building_name}</Text>
                        <Text style={styles.dayModalItemSub}>{m.maintenance_type_label} • {m.status_label}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      ) : null}

      {viewMode === 'list' && (isLoading && maintenances.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMaintenances}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          renderItem={renderMaintenanceItem}
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
          // Performance optimizations
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 120,
            offset: 120 * index,
            index,
          })}
        />
      ))}

      {/* Yeni Bakım FAB - Sadece admin */}
      {!isEmployee && viewMode === 'list' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            hapticFeedback.light();
            navigation.navigate('MaintenanceCreate');
          }}
        >
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
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

  // Header
  header: {
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
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
  viewModeRow: {
    flexDirection: 'row',
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingBottom: 10,
    gap: 8,
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: COLORS.primary[700],
  },
  viewModeBtnActive: { backgroundColor: COLORS.primary[400] },
  viewModeBtnText: { fontSize: DIMENSIONS.FONT_SIZE.SM, color: COLORS.primary[200] },
  viewModeBtnTextActive: { color: COLORS.white, fontWeight: '600' },

  calendarSection: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginHorizontal: DIMENSIONS.SCREEN_PADDING,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarNavBtn: { padding: 8 },
  calendarMonthTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: '700',
    color: COLORS.gray[900],
  },
  weekDayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
    color: COLORS.gray[500],
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  calendarDayOther: { opacity: 0.3 },
  calendarDayNum: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
    fontWeight: '500',
  },
  calendarDayNumOther: { color: COLORS.gray[400] },
  calendarDayBadge: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: COLORS.primary[500],
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  calendarLoading: { padding: 24, alignItems: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dayModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '50%',
  },
  dayModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DIMENSIONS.SCREEN_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  dayModalTitle: { fontSize: DIMENSIONS.FONT_SIZE.XL, fontWeight: '700', color: COLORS.gray[900] },
  dayModalScroll: { maxHeight: 300, padding: DIMENSIONS.SCREEN_PADDING },
  dayModalEmpty: { fontSize: DIMENSIONS.FONT_SIZE.BASE, color: COLORS.gray[500], textAlign: 'center', padding: 24 },
  dayModalItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  dayModalItemTitle: { fontSize: DIMENSIONS.FONT_SIZE.BASE, fontWeight: '600', color: COLORS.gray[900] },
  dayModalItemSub: { fontSize: DIMENSIONS.FONT_SIZE.SM, color: COLORS.gray[600], marginTop: 2 },
  fab: {
    position: 'absolute',
    right: DIMENSIONS.SCREEN_PADDING,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  // Admin Controls
  adminControls: {
    flexDirection: 'row',
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[700],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonText: {
    color: 'white',
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[700],
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
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  filterChipActive: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  filterChipText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: 'white',
  },
  
  // Stats Card
  statsCard: {
    backgroundColor: 'white',
    marginHorizontal: DIMENSIONS.SCREEN_PADDING,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  statLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
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

  // List
  listContainer: {
    padding: DIMENSIONS.SCREEN_PADDING,
  },

  // Maintenance Card
  maintenanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  priorityIndicator: {
    width: 4,
    alignSelf: 'stretch',
  },
  maintenanceContent: {
    flex: 1,
    padding: 16,
  },
  maintenanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  maintenanceTitleSection: {
    flex: 1,
  },
  buildingName: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  elevatorCode: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    fontFamily: 'monospace',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '700',
  },
  maintenanceDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[700],
    marginLeft: 8,
  },
  approvalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.warning[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  approvalBadgeText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.warning[700],
    fontWeight: '600',
    marginLeft: 4,
  },
  quickActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  quickActionText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.success[600],
    fontWeight: '600',
    marginLeft: 4,
  },

  // Empty State
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

  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[600],
  },
  errorContainer: {
    backgroundColor: COLORS.error[50],
    padding: 12,
    margin: DIMENSIONS.SCREEN_PADDING,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
  },
  errorText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.error[700],
    textAlign: 'center',
  },
});

export default MaintenanceScreen;
