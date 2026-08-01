// 📊 ENTERPRISE DASHBOARD STATE MANAGEMENT
// Gerçek zamanlı istatistikler, grafikler, performans optimizasyonu

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { apiClient, isRequestCancelled } from '../services/api/client';
import { API_ENDPOINTS, REFRESH_INTERVALS } from '../constants';
import { realtimeService } from '../services/realtime/RealtimeService';
import { DashboardStats, ChartData, MonthlyTrendData, LoadingState } from '../types';

interface DashboardState extends LoadingState {
  // State
  stats: DashboardStats | null;
  monthlyTrend: MonthlyTrendData[];
  weeklyChart: ChartData | null;
  lastUpdated: number | null;
  autoRefreshEnabled: boolean;
  
  // Employee specific
  isEmployee: boolean;
  employeeInfo: any | null;
  assignedTasks: any[];
  
  // Actions
  fetchDashboardData: (signal?: AbortSignal) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchCharts: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setAutoRefresh: (enabled: boolean) => void;
  setupRealtimeUpdates: () => () => void;
  
  // Utility actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  subscribeWithSelector((set, get) => ({
    // ==================== INITIAL STATE ====================
    stats: null,
    monthlyTrend: [],
    weeklyChart: null,
    lastUpdated: null,
    autoRefreshEnabled: true,
    isLoading: false,
    error: undefined,
    
    // Employee specific
    isEmployee: false,
    employeeInfo: null,
    assignedTasks: [],

    // ==================== FETCH DASHBOARD DATA ====================
    fetchDashboardData: async (signal?: AbortSignal) => {
      const { setLoading, setError, clearError } = get();

      try {
        setLoading(true);
        clearError();

        const [statsResponse, chartsResponse] = await Promise.all([
          apiClient.get(API_ENDPOINTS.DASHBOARD_STATS, { signal }),
          apiClient.get(API_ENDPOINTS.DASHBOARD_CHARTS, { signal }),
        ]);

        if (signal?.aborted) return;

        // Backend'den { success: true, data: {...} } formatında geliyor
        const statsData = statsResponse.data.data || statsResponse.data;
        const chartsData = chartsResponse.data.data || chartsResponse.data;

        set({
          stats: statsData,
          monthlyTrend: chartsData?.monthlyTrend || chartsData?.data?.monthlyTrend || [],
          weeklyChart: chartsData?.weeklyChart || chartsData?.data?.weeklyChart || null,
          lastUpdated: Date.now(),
          isLoading: false,
        });
      } catch (error: any) {
        if (isRequestCancelled(error)) {
          set({ isLoading: false });
          return;
        }
        console.error('❌ Dashboard fetch error:', error);
        setError(error.message || 'Dashboard verileri yüklenemedi');
        set({ isLoading: false });
      }
    },

    // ==================== SETUP REALTIME UPDATES ====================
    setupRealtimeUpdates: () => {
      const { fetchDashboardData, fetchStats } = get();
      
      // İş durumu değişikliklerini dinle
      const unsubscribeStatusChanged = realtimeService.on('maintenance.status.changed', async (event) => {
        // Dashboard verilerini güncelle
        await fetchStats();
      });

      // Yeni iş oluşturulduğunda
      const unsubscribeCreated = realtimeService.on('maintenance.created', async (event) => {
        await fetchDashboardData();
      });

      // İş güncellendiğinde
      const unsubscribeUpdated = realtimeService.on('maintenance.updated', async (event) => {
        await fetchStats();
      });

      // Cleanup function
      return () => {
        unsubscribeStatusChanged();
        unsubscribeCreated();
        unsubscribeUpdated();
      };
    },

    // ==================== FETCH STATS ONLY ====================
    fetchStats: async () => {
      try {
        const response = await apiClient.get(API_ENDPOINTS.DASHBOARD_STATS);
        
        // Backend'den { success: true, data: {...} } formatında geliyor
        set({
          stats: response.data.data || response.data,
          lastUpdated: Date.now(),
        });

      } catch (error: any) {
        console.error('❌ Stats fetch error:', error);
        // Stats hatası için error set etme, sessizce geç
      }
    },

    // ==================== FETCH CHARTS ONLY ====================
    fetchCharts: async () => {
      try {
        const response = await apiClient.get(API_ENDPOINTS.DASHBOARD_CHARTS);
        
        // Backend'den { success: true, data: {...} } formatında geliyor
        set({
          monthlyTrend: response.data.data?.monthlyTrend || response.data.monthlyTrend || [],
          weeklyChart: response.data.data?.weeklyChart || response.data.weeklyChart || null,
          lastUpdated: Date.now(),
        });

      } catch (error: any) {
        console.error('❌ Charts fetch error:', error);
        // Charts hatası için error set etme, sessizce geç
      }
    },

    // ==================== REFRESH ALL ====================
    refreshAll: async () => {
      const { fetchDashboardData } = get();
      await fetchDashboardData();
    },

    // ==================== AUTO REFRESH CONTROL ====================
    setAutoRefresh: (enabled: boolean) => {
      set({ autoRefreshEnabled: enabled });
    },

    // ==================== UTILITY ACTIONS ====================
    setLoading: (loading: boolean) => {
      set({ isLoading: loading });
    },

    setError: (error: string | null) => {
      set({ error: error || undefined });
    },

    clearError: () => {
      set({ error: undefined });
    },
  }))
);

// ==================== SELECTORS ====================
export const dashboardSelectors = {
  stats: (state: DashboardState) => state.stats,
  monthlyTrend: (state: DashboardState) => state.monthlyTrend,
  weeklyChart: (state: DashboardState) => state.weeklyChart,
  isLoading: (state: DashboardState) => state.isLoading,
  error: (state: DashboardState) => state.error,
  lastUpdated: (state: DashboardState) => state.lastUpdated,
  autoRefreshEnabled: (state: DashboardState) => state.autoRefreshEnabled,
  
  // Computed selectors
  totalRevenue: (state: DashboardState) => {
    if (!state.stats) return 0;
    const income = state.stats.thisMonthIncome || 0;
    const expense = state.stats.thisMonthExpense || 0;
    return income - expense;
  },
  
  completionRate: (state: DashboardState) => 
    state.stats && state.stats.activeMaintenances > 0 
      ? (state.stats.completedMaintenance / state.stats.activeMaintenances) * 100 
      : 0,
      
  isDataStale: (state: DashboardState) => 
    !state.lastUpdated || (Date.now() - state.lastUpdated) > REFRESH_INTERVALS.DASHBOARD,
};

// ==================== HOOKS ====================
export const useDashboard = () => {
  const store = useDashboardStore();
  
  return {
    // State
    stats: store.stats,
    monthlyTrend: store.monthlyTrend,
    weeklyChart: store.weeklyChart,
    isLoading: store.isLoading,
    error: store.error,
    lastUpdated: store.lastUpdated,
    autoRefreshEnabled: store.autoRefreshEnabled,
    
    // Employee specific
    isEmployee: store.isEmployee,
    employeeInfo: store.employeeInfo,
    assignedTasks: store.assignedTasks,
    
    // Computed
    totalRevenue: dashboardSelectors.totalRevenue(store),
    completionRate: dashboardSelectors.completionRate(store),
    isDataStale: dashboardSelectors.isDataStale(store),
    
    // Actions
    fetchDashboardData: (signal?: AbortSignal) => store.fetchDashboardData(signal),
    fetchStats: store.fetchStats,
    fetchCharts: store.fetchCharts,
    refreshAll: store.refreshAll,
    setAutoRefresh: store.setAutoRefresh,
    clearError: store.clearError,
  };
};
