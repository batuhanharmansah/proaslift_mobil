// 📊 ENTERPRISE DASHBOARD SCREEN
// Gerçek zamanlı istatistikler, interaktif grafikler, akıllı bildirimler

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

// Hooks & Services
import { useAuth } from '../../store/authStore';
import { useDashboard } from '../../store/dashboardStore';
import { formatCurrency, formatDate, hapticFeedback } from '../../utils';
import { COLORS, DIMENSIONS } from '../../constants';

// Components
import StatsCard from '../../components/cards/StatsCard';
import NotificationBellButton from '../../components/notifications/NotificationBellButton';
import StockWarningsWidget from '../../components/inventory/StockWarningsWidget';
import TodayJobsWidget from '../../components/tasks/TodayJobsWidget';

const { width: screenWidth } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DashboardScreen: React.FC = () => {
  // ==================== STATE ====================
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();
  const { user, logout } = useAuth();
  const {
    stats,
    monthlyTrend,
    weeklyChart,
    isLoading,
    error,
    totalRevenue,
    completionRate,
    isDataStale,
    isEmployee,
    employeeInfo,
    assignedTasks,
    fetchDashboardData,
    refreshAll,
    clearError,
  } = useDashboard();

  // ==================== EFFECTS ====================
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      fetchDashboardData(controller.signal);
      return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // ==================== HANDLERS ====================
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    
    try {
      await refreshAll();
      setLastRefreshTime(new Date());
      await hapticFeedback.success();
    } catch (error) {
      await hapticFeedback.error();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAll]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Çıkış Yap',
      'Oturumunuzu kapatmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            await hapticFeedback.medium();
            await logout();
          },
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
            <Text style={styles.userCompany}>{user?.name}</Text>
          </View>
        </View>

        <NotificationBellButton iconColor="white" />
      </View>
      
      {/* Last update info */}
      <View style={styles.lastUpdateContainer}>
        <Ionicons name="time-outline" size={14} color={COLORS.primary[200]} />
        <Text style={styles.lastUpdateText}>
          Son güncelleme: {formatDate(lastRefreshTime.toISOString(), 'relative')}
        </Text>
      </View>
    </View>
  );

  const renderQuickStats = () => (
    <View style={styles.quickStatsContainer}>
      <Text style={styles.sectionTitle}>Hızlı İstatistikler</Text>
      
      <View style={styles.statsGrid}>
        <StatsCard
          title="Toplam Bina"
          value={stats?.totalBuildings || 0}
          icon="business"
          color={COLORS.primary[500]}
          subtitle={`${stats?.activeCustomers || 0} aktif`}
          onPress={() => navigation.navigate('Buildings')}
        />
        
        <StatsCard
          title="Bu Ay Gelir"
          value={formatCurrency(stats?.thisMonthIncome || 0)}
          icon="trending-up"
          color={COLORS.success[500]}
          subtitle="Aylık gelir"
          onPress={() => navigation.navigate('Financial')}
        />
        
        <StatsCard
          title="Bekleyen Bakım"
          value={stats?.activeMaintenances || 0}
          icon="construct"
          color={COLORS.warning[500]}
          subtitle="Planlı işler"
          onPress={() => navigation.navigate('Maintenance', { initialTab: 'overdue' })}
        />
        
        <StatsCard
          title="Tamamlanan"
          value={stats?.completedMaintenance || 0}
          icon="checkmark-circle"
          color={COLORS.success[500]}
          subtitle={`%${Math.round(completionRate)} tamamlanma`}
          onPress={() => navigation.navigate('Maintenance', { initialTab: 'completed' })}
        />
      </View>
    </View>
  );

  const renderFinancialSummary = () => (
    <View style={styles.financialContainer}>
      <Text style={styles.sectionTitle}>Finansal Özet</Text>
      
      <View style={styles.financialCard}>
        <View style={styles.financialRow}>
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Gelir</Text>
            <Text style={[styles.financialValue, { color: COLORS.success[500] }]}>
              {formatCurrency(stats?.thisMonthIncome || 0)}
            </Text>
          </View>
          
          <View style={styles.financialDivider} />
          
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Gider</Text>
            <Text style={[styles.financialValue, { color: COLORS.error[500] }]}>
              {formatCurrency(stats?.thisMonthExpense || 0)}
            </Text>
          </View>
        </View>
        
        <View style={styles.financialTotal}>
          <Text style={styles.financialTotalLabel}>Net Gelir</Text>
          <Text style={[
            styles.financialTotalValue,
            { color: totalRevenue >= 0 ? COLORS.success[500] : COLORS.error[500] }
          ]}>
            {formatCurrency(totalRevenue)}
          </Text>
        </View>
      </View>
    </View>
  );



  // ==================== EMPLOYEE DASHBOARD ====================
  const renderEmployeeDashboard = () => (
    <>
      {/* Employee Info Card */}
      <View style={styles.employeeInfoCard}>
        <View style={styles.employeeHeader}>
          <Ionicons name="person-circle" size={48} color={COLORS.primary[600]} />
          <View style={styles.employeeDetails}>
            <Text style={styles.employeeName}>{employeeInfo?.name}</Text>
            <Text style={styles.employeePosition}>{employeeInfo?.position}</Text>
          </View>
        </View>
      </View>

      {/* Employee Quick Stats */}
      <View style={styles.statsGrid}>
        <StatsCard
          title="Atanan İşler"
          value={stats?.assigned_tasks_count || 0}
          icon="clipboard"
          color={COLORS.primary[500]}
        />
        <StatsCard
          title="Bugün"
          value={stats?.today_tasks || 0}
          icon="today"
          color={COLORS.warning[500]}
        />
        <StatsCard
          title="Bu Hafta"
          value={stats?.this_week_tasks || 0}
          icon="calendar"
          color={COLORS.success[500]}
        />
        <StatsCard
          title="Geciken"
          value={stats?.overdue_tasks || 0}
          icon="alert-circle"
          color={COLORS.error[500]}
        />
      </View>

      {/* Assigned Tasks List */}
      <View style={styles.tasksSection}>
        <Text style={styles.sectionTitle}>📋 Atanan İşler</Text>
        
        {assignedTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.gray[300]} />
            <Text style={styles.emptyStateText}>Atanmış iş bulunmuyor</Text>
          </View>
        ) : (
          assignedTasks.map((task: any, index: number) => {
            const getStatusBadgeStyle = (status: string) => {
              const statusStyles: any = {
                planli: styles.statusBadge_planli,
                atandi: styles.statusBadge_atandi,
                baslandi: styles.statusBadge_baslandi,
              };
              return statusStyles[status] || {};
            };

            return (
              <View key={`task-${task.id}-${index}`} style={[
                styles.taskCard,
                task.is_overdue && styles.taskCardOverdue
              ]}>
                <View style={styles.taskHeader}>
                  <View style={styles.taskIconContainer}>
                    <Ionicons name="construct" size={20} color={COLORS.primary[600]} />
                  </View>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskBuilding}>{task.building_name}</Text>
                    <Text style={styles.taskType}>{task.maintenance_type_label}</Text>
                  </View>
                  {task.is_overdue && (
                    <View style={styles.overdueBadge}>
                      <Text style={styles.overdueBadgeText}>GECİKMİŞ</Text>
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
                  
                  {task.days_until !== undefined && !task.is_overdue && (
                    <Text style={styles.daysUntil}>
                      {task.days_until === 0 ? 'Bugün' : `${task.days_until} gün sonra`}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </>
  );

  // ==================== MAIN RENDER ====================
  try {
    return (
      <SafeAreaView style={styles.container}>
        <CustomSidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
        />
        
        {renderHeader()}
        
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

          {/* Conditional Rendering: Employee vs Normal User */}
          {isEmployee ? (
            renderEmployeeDashboard()
          ) : (
            <>
              {renderQuickStats()}
              {renderFinancialSummary()}
              
              {/* Günün İşleri */}
              <TodayJobsWidget limit={5} showHeader={true} />
              
              {/* Depo Uyarıları - Sadece Admin için */}
              <StockWarningsWidget limit={5} showHeader={true} />
            </>
          )}
          
          {/* Spacer for bottom tab */}
          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    );
  } catch (error) {
    console.error('❌ DashboardScreen render error:', error);
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="alert-circle" size={64} color={COLORS.error[500]} />
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 16, color: COLORS.gray[900] }}>
            Dashboard Yüklenirken Hata
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
  
  // Header styles
  header: {
    backgroundColor: COLORS.primary[600],
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary[500],
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitials: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: 'white',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[200],
  },
  userCompany: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: 'white',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primary[500],
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  lastUpdateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastUpdateText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.primary[200],
    marginLeft: 4,
  },

  // Content styles
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: DIMENSIONS.SCREEN_PADDING,
  },

  // Section styles
  sectionTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 16,
  },

  // Quick stats
  quickStatsContainer: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // Financial summary
  financialContainer: {
    marginBottom: 24,
  },
  financialCard: {
    backgroundColor: 'white',
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  financialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  financialItem: {
    flex: 1,
    alignItems: 'center',
  },
  financialDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.gray[200],
    marginHorizontal: 20,
  },
  financialLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginBottom: 4,
  },
  financialValue: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
  },
  financialTotal: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  financialTotalLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[700],
    marginBottom: 4,
  },
  financialTotalValue: {
    fontSize: DIMENSIONS.FONT_SIZE.XXL,
    fontWeight: 'bold',
  },

  // Quick actions
  quickActionsContainer: {
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },


  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error[50],
    padding: 12,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.error[200],
  },
  errorBannerText: {
    flex: 1,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.error[700],
    marginHorizontal: 8,
  },
  
  // Employee Dashboard Styles
  employeeInfoCard: {
    backgroundColor: 'white',
    marginHorizontal: DIMENSIONS.SCREEN_PADDING,
    marginTop: DIMENSIONS.SCREEN_PADDING,
    borderRadius: DIMENSIONS.BORDER_RADIUS_LG,
    padding: DIMENSIONS.SCREEN_PADDING,
    ...DIMENSIONS.SHADOW_MD,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeDetails: {
    marginLeft: 12,
    flex: 1,
  },
  employeeName: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  employeePosition: {
    fontSize: DIMENSIONS.FONT_SIZE.MD,
    color: COLORS.gray[600],
    marginTop: 2,
  },
  
  // Tasks Section
  tasksSection: {
    marginHorizontal: DIMENSIONS.SCREEN_PADDING,
    marginTop: DIMENSIONS.SCREEN_PADDING,
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: DIMENSIONS.BORDER_RADIUS_LG,
    padding: DIMENSIONS.SCREEN_PADDING,
    marginBottom: 12,
    ...DIMENSIONS.SHADOW_SM,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary[500],
  },
  taskCardOverdue: {
    borderLeftColor: COLORS.error[500],
    backgroundColor: COLORS.error[50],
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primary[50],
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskBuilding: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  taskType: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginTop: 2,
  },
  overdueBadge: {
    backgroundColor: COLORS.error[500],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  overdueBadgeText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: 'bold',
    color: 'white',
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
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[700],
    marginLeft: 6,
  },
  taskDescription: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginTop: 8,
    fontStyle: 'italic',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
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
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  daysUntil: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    color: COLORS.gray[500],
    marginTop: 16,
  },
});

export default DashboardScreen;
