// 👷 EMPLOYEE DASHBOARD SCREEN
// Çalışanlara özel dashboard - sadece atanan işler

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { COLORS, DIMENSIONS as DIMS } from '../../constants';
import { useAuth } from '../../store/authStore';
import { useEmployeeDashboard } from '../../store/employeeDashboardStore';
import { hapticFeedback, formatDate } from '../../utils';
import { groupTasksByDate, isTaskToday, isTaskUrgent, getPriorityColor, Task } from '../../utils/taskUtils';
import { taskNotificationService } from '../../services/notifications/TaskNotificationService';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import NotificationBellButton from '../../components/notifications/NotificationBellButton';
import CountdownTimer from '../../components/tasks/CountdownTimer';

const { width: screenWidth } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const EmployeeDashboardScreen: React.FC = () => {
  // ==================== STATE ====================
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();
  const {
    stats,
    employeeInfo,
    assignedTasks,
    isLoading,
    error,
    fetchEmployeeData,
    refreshAll,
    clearError,
  } = useEmployeeDashboard();

  // ==================== EFFECTS ====================
  // Acil işler için bildirimleri planla
  useEffect(() => {
    if (assignedTasks.length > 0) {
      taskNotificationService.scheduleUrgentTasksNotifications(assignedTasks as Task[]);
    }
  }, [assignedTasks]);

  useFocusEffect(
    useCallback(() => {
      // Screen'e odaklandığında veri yenile (ilk açılış dahil)
      fetchEmployeeData();
    }, [fetchEmployeeData])
  );

  // ==================== HANDLERS ====================
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    
    try {
      await refreshAll();
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAll]);

  const handleRetry = useCallback(async () => {
    await hapticFeedback.light();
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  const handleTaskPress = useCallback(async (task: any) => {
    hapticFeedback.light();

    const buildScheduleFromTask = (t: any) => ({
      id: t.id,
      company_id: t.company_id || 0,
      building_id: t.building_id || 0,
      assigned_employee_id: t.assigned_employee_id ?? null,
      maintenance_type: t.maintenance_type || 'rutin_bakim',
      maintenance_type_label: t.maintenance_type_label || 'Rutin Bakım',
      scheduled_date: t.scheduled_date || new Date().toISOString().split('T')[0],
      scheduled_time: t.scheduled_time ?? null,
      priority: t.priority || 'normal',
      priority_label: t.priority_label || 'Normal',
      status: t.status || 'planli',
      status_label: t.status_label || 'Planlı',
      description: t.description || '',
      notes: t.notes ?? null,
      estimated_cost: t.estimated_cost ?? null,
      estimated_duration: t.estimated_duration ?? null,
      created_at: t.created_at || new Date().toISOString(),
      updated_at: t.updated_at || new Date().toISOString(),
      building: t.building ?? null,
      assignedEmployee: t.assigned_employee ?? null,
    });

    // Ekranı sunucu isteğini beklemeden hemen aç — Aktif İş ekranı zaten
    // odaklandığında kendi güncel verisini çekiyor (loadMaintenanceDetail),
    // burada listeden gelen veriyle anında navigasyon yeterli. Önceden burada
    // navigasyondan ÖNCE bir API isteği bekleniyordu ve hiçbir yükleniyor
    // göstergesi olmadığı için kart "donmuş/tepkisiz" gibi görünüyordu.
    navigation.navigate('ActiveJob', {
      maintenanceScheduleId: task.id,
      maintenanceSchedule: buildScheduleFromTask(task),
    });
  }, [navigation]);

  const handleLogout = useCallback(async () => {
    await hapticFeedback.light();
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkmak istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  }, [logout]);

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
        
        <View style={styles.userInfo}>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>Hoş geldiniz,</Text>
            <Text style={styles.userCompany}>{employeeInfo?.name || user?.name}</Text>
            <Text style={styles.userPosition}>{employeeInfo?.position}</Text>
          </View>
        </View>

        <NotificationBellButton iconColor="white" />
      </View>
      
      {/* Last update info */}
      <View style={styles.lastUpdateContainer}>
        <Ionicons name="time-outline" size={14} color={COLORS.primary[200]} />
        <Text style={styles.lastUpdateText}>
          Son Güncelleme: {formatDate(lastRefreshTime, 'HH:mm')}
        </Text>
      </View>
    </View>
  );

  const renderEmployeeStats = () => (
    <View style={styles.statsGrid}>
      {/* 1. satır: Atanan İşler | Bugün */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="clipboard" size={24} color={COLORS.primary[600]} />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{stats?.assigned_tasks_count || 0}</Text>
            <Text style={styles.statLabel}>Atanan İşler</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="today" size={24} color={COLORS.warning[500]} />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{stats?.today_tasks || 0}</Text>
            <Text style={styles.statLabel}>Bugün</Text>
          </View>
        </View>
      </View>
      {/* 2. satır: Bu Hafta | Geciken */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="calendar" size={24} color={COLORS.success[500]} />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{stats?.this_week_tasks || 0}</Text>
            <Text style={styles.statLabel}>Bu Hafta</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="alert-circle" size={24} color={COLORS.error[500]} />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{stats?.overdue_tasks || 0}</Text>
            <Text style={styles.statLabel}>Geciken</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderAssignedTasks = () => {
    // İşleri tarihe göre grupla
    const groupedTasks = groupTasksByDate(assignedTasks as Task[]);
    
    // Öncelikli sıralama: Bugün > Gecikmiş > Yaklaşan > Sonraki
    const prioritizedTasks = [
      ...groupedTasks.today,
      ...groupedTasks.overdue,
      ...groupedTasks.upcoming,
      ...groupedTasks.later,
    ];
    
    return (
      <View style={styles.tasksSection}>
        <Text style={styles.sectionTitle}>📋 Atanan İşler</Text>
        
        {prioritizedTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.gray[300]} />
            <Text style={styles.emptyStateText}>Atanmış iş bulunmuyor</Text>
          </View>
        ) : (
          <>
            {/* Bugünün İşleri Başlığı */}
            {groupedTasks.today.length > 0 && (
              <View style={styles.sectionHeader}>
                <View style={styles.todayBadge}>
                  <Ionicons name="today" size={16} color={COLORS.error[500]} />
                  <Text style={styles.todayBadgeText}>
                    Bugün ({groupedTasks.today.length})
                  </Text>
                </View>
              </View>
            )}
            
            {/* İşleri Render Et */}
            {prioritizedTasks.map((task: any, index: number) => {
              const isToday = isTaskToday(task as Task);
              const isUrgent = isTaskUrgent(task as Task);
              const priorityColor = getPriorityColor(task as Task);
              
              return (
                <TouchableOpacity
                  key={`task-${task.id}-${index}`}
                  style={[
                    styles.taskCard,
                    task.is_overdue && styles.taskCardOverdue,
                    isToday && styles.taskCardToday,
                    isUrgent && styles.taskCardUrgent,
                  ]}
                  onPress={() => handleTaskPress(task)}
                >
                  {/* Renkli Vurgu (Bugünün İşleri) */}
                  {isToday && (
                    <View style={[styles.todayIndicator, { backgroundColor: priorityColor }]} />
                  )}
                  
                  <View style={styles.taskHeader}>
                    <View style={[
                      styles.taskIconContainer,
                      isToday && { backgroundColor: `${priorityColor}20` }
                    ]}>
                      <Ionicons 
                        name="construct" 
                        size={20} 
                        color={isToday ? priorityColor : COLORS.primary[600]} 
                      />
                    </View>
                    <View style={styles.taskInfo}>
                      <Text style={[
                        styles.taskBuilding,
                        isToday && styles.taskBuildingToday
                      ]}>
                        {task.building_name}
                      </Text>
                      <Text style={styles.taskType}>{task.maintenance_type_label}</Text>
                    </View>
                    {task.is_overdue && (
                      <View style={styles.overdueBadge}>
                        <Text style={styles.overdueBadgeText}>GECİKMİŞ</Text>
                      </View>
                    )}
                    {isUrgent && !task.is_overdue && (
                      <View style={[styles.urgentBadge, { backgroundColor: priorityColor }]}>
                        <Text style={styles.urgentBadgeText}>ACİL</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.taskDetails}>
                    <View style={styles.taskDetailRow}>
                      <Ionicons name="calendar-outline" size={16} color={COLORS.gray[500]} />
                      <Text style={styles.taskDetailText}>
                        {new Date(task.scheduled_date).toLocaleDateString('tr-TR')}
                        {task.scheduled_time && ` • ${task.scheduled_time}`}
                      </Text>
                    </View>
                    
                    {task.building_address && (
                      <View style={styles.taskDetailRow}>
                        <Ionicons name="location-outline" size={16} color={COLORS.gray[500]} />
                        <Text style={styles.taskDetailText}>{task.building_address}</Text>
                      </View>
                    )}
                    
                    {task.description && (
                      <Text style={styles.taskDescription}>{task.description}</Text>
                    )}
                  </View>
                  
                  <View style={styles.taskFooter}>
                    <View style={[styles.statusBadge, getStatusBadgeStyle(task.status)]}>
                      <Text style={styles.statusBadgeText}>{task.status_label}</Text>
                    </View>
                    
                    {/* Countdown Timer (Bugünün ve yaklaşan işler için) */}
                    {(isToday || groupedTasks.upcoming.includes(task as Task)) && task.scheduled_time ? (
                      <CountdownTimer
                        targetDate={task.scheduled_date}
                        targetTime={task.scheduled_time}
                        compact={true}
                        showIcon={true}
                      />
                    ) : task.days_until !== undefined && !task.is_overdue ? (
                      <Text style={styles.daysUntil}>
                        {task.days_until === 0 ? 'Bugün' : `${task.days_until} gün sonra`}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </View>
    );
  };

  const getStatusBadgeStyle = (status: string) => {
    const statusStyles: any = {
      planli: styles.statusBadge_planli,
      atandi: styles.statusBadge_atandi,
      baslandi: styles.statusBadge_baslandi,
    };
    return statusStyles[status] || {};
  };

  // ==================== RENDER ====================
  try {
    return (
      <SafeAreaView style={styles.container}>
        <CustomSidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
        />

        {renderHeader()}

        {isLoading && stats == null && !error ? (
          <View style={styles.initialLoading}>
            <ActivityIndicator size="large" color={COLORS.primary[200]} />
            <Text style={styles.initialLoadingText}>Veriler yükleniyor…</Text>
          </View>
        ) : error && stats == null ? (
          <View style={styles.initialStateContainer}>
            <Ionicons name="cloud-offline-outline" size={56} color={COLORS.error[500]} />
            <Text style={styles.initialStateTitle}>Veriler yüklenemedi</Text>
            <Text style={styles.initialStateSubtitle}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary[500]]}
                tintColor={COLORS.primary[500]}
              />
            }
          >
            {/* Error State */}
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color={COLORS.error[500]} />
                <Text style={styles.errorBannerText}>{error}</Text>
                <TouchableOpacity onPress={clearError}>
                  <Ionicons name="close" size={20} color={COLORS.error[500]} />
                </TouchableOpacity>
              </View>
            )}

            {/* Employee Stats */}
            {renderEmployeeStats()}

            {/* Assigned Tasks */}
            {renderAssignedTasks()}

            {/* Spacer for bottom tab */}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    );
  } catch (error) {
    console.error('❌ EmployeeDashboardScreen render error:', error);
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="alert-circle" size={64} color={COLORS.error[500]} />
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 16, color: COLORS.gray[900] }}>
            Employee Dashboard Yüklenirken Hata
          </Text>
          <Text style={{ fontSize: 14, marginTop: 8, color: COLORS.gray[600], textAlign: 'center' }}>
            {String(error)}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    backgroundColor: COLORS.primary[600],
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuButton: {
    marginRight: 16,
    padding: 4,
  },
  userInfo: {
    flex: 1,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    color: COLORS.primary[200],
    fontWeight: '500',
  },
  userCompany: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
    marginTop: 2,
  },
  userPosition: {
    fontSize: 14,
    color: COLORS.primary[200],
    marginTop: 2,
  },
  lastUpdateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  lastUpdateText: {
    fontSize: 12,
    color: COLORS.primary[200],
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  initialLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  initialLoadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.primary[200],
  },
  initialStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  initialStateTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray[900],
  },
  initialStateSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  contentContainer: {
    padding: 16,
  },
  errorBanner: {
    backgroundColor: COLORS.error[50],
    borderColor: COLORS.error[200],
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorBannerText: {
    flex: 1,
    color: COLORS.error[700],
    fontSize: 14,
    marginLeft: 8,
  },
  statsGrid: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray[600],
    fontWeight: '500',
  },
  tasksSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.gray[500],
    marginTop: 16,
    textAlign: 'center',
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  taskCardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error[500],
  },
  taskCardToday: {
    borderWidth: 2,
    borderColor: COLORS.warning[300],
    backgroundColor: COLORS.warning[50],
  },
  taskCardUrgent: {
    borderWidth: 2,
    borderColor: COLORS.error[300],
    backgroundColor: COLORS.error[50],
  },
  todayIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 4,
  },
  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  todayBadgeText: {
    fontSize: DIMS.FONT_SIZE.SM,
    fontWeight: 'bold',
    color: COLORS.error[700],
  },
  urgentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  urgentBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskBuilding: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  taskBuildingToday: {
    color: COLORS.error[700],
  },
  taskType: {
    fontSize: 14,
    color: COLORS.gray[600],
    marginTop: 2,
  },
  overdueBadge: {
    backgroundColor: COLORS.error[500],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  overdueBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  taskDetails: {
    marginBottom: 12,
  },
  taskDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskDetailText: {
    fontSize: 14,
    color: COLORS.gray[600],
    marginLeft: 8,
  },
  taskDescription: {
    fontSize: 14,
    color: COLORS.gray[700],
    marginTop: 8,
    fontStyle: 'italic',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadge_planli: {
    backgroundColor: COLORS.blue[100],
  },
  statusBadge_atandi: {
    backgroundColor: COLORS.warning[100],
  },
  statusBadge_baslandi: {
    backgroundColor: COLORS.success[100],
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.gray[700],
  },
  daysUntil: {
    fontSize: 12,
    color: COLORS.gray[500],
    fontWeight: '500',
  },
});

export default EmployeeDashboardScreen;
