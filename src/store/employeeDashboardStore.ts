// 👷 EMPLOYEE DASHBOARD STATE MANAGEMENT
// Çalışanlara özel dashboard state yönetimi

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { apiClient } from '../services/api/client';
import { API_ENDPOINTS } from '../constants';
import { realtimeService } from '../services/realtime/RealtimeService';
import { LoadingState } from '../types';

const EMPLOYEE_DASHBOARD_TIMEOUT_MS = 15000;

interface EmployeeDashboardState extends LoadingState {
  // State
  stats: any | null;
  employeeInfo: any | null;
  assignedTasks: any[];
  lastUpdated: number | null;
  isFetching: boolean;

  // Actions
  fetchEmployeeData: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setupRealtimeUpdates: () => () => void;

  // Utility actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useEmployeeDashboardStore = create<EmployeeDashboardState>()(
  subscribeWithSelector((set, get) => ({
    // ==================== INITIAL STATE ====================
    stats: null,
    employeeInfo: null,
    assignedTasks: [],
    lastUpdated: null,
    isLoading: false,
    isFetching: false,
    error: undefined,

    // ==================== FETCH EMPLOYEE DATA ====================
    fetchEmployeeData: async () => {
      if (get().isFetching) return;

      const { setLoading, setError, clearError } = get();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), EMPLOYEE_DASHBOARD_TIMEOUT_MS);

      try {
        set({ isFetching: true });
        setLoading(true);
        clearError();

        const response = await apiClient.get(API_ENDPOINTS.DASHBOARD_STATS, {
          signal: controller.signal,
        }) as any;

        if (response?.success === false) {
          throw new Error(response?.message || 'Çalışan dashboard verileri yüklenemedi');
        }

        set({
          stats: response?.data ?? response,
          employeeInfo: response?.employee_info ?? null,
          assignedTasks: response?.assigned_tasks ?? [],
          lastUpdated: Date.now(),
        });
      } catch (error: any) {
        console.error('❌ Employee dashboard fetch error:', error);
        const isTimeout =
          controller.signal.aborted ||
          error?.name === 'CanceledError' ||
          error?.code === 'ERR_CANCELED';

        setError(
          isTimeout
            ? 'Sunucu yanıtı gecikti. Lütfen tekrar deneyin.'
            : (error.message || 'Çalışan dashboard verileri yüklenemedi')
        );
      } finally {
        clearTimeout(timeoutId);
        set({ isLoading: false, isFetching: false });
      }
    },

    // ==================== REFRESH ALL ====================
    refreshAll: async () => {
      const { fetchEmployeeData } = get();
      await fetchEmployeeData();
    },

    // ==================== SETUP REALTIME UPDATES ====================
    setupRealtimeUpdates: () => {
      const { fetchEmployeeData } = get();
      
      // İş durumu değişikliklerini dinle
      const unsubscribeStatusChanged = realtimeService.on('maintenance.status.changed', async (event) => {
        // Dashboard verilerini güncelle
        await fetchEmployeeData();
      });

      // Yeni iş oluşturulduğunda
      const unsubscribeCreated = realtimeService.on('maintenance.created', async (event) => {
        await fetchEmployeeData();
      });

      // İş güncellendiğinde
      const unsubscribeUpdated = realtimeService.on('maintenance.updated', async (event) => {
        await fetchEmployeeData();
      });

      // Konum güncellemelerini dinle (sadece admin için)
      const unsubscribeLocation = realtimeService.on('location.updated', async (event) => {
        // Konum güncellemeleri için özel işlem yapılabilir
      });

      // Cleanup function
      return () => {
        unsubscribeStatusChanged();
        unsubscribeCreated();
        unsubscribeUpdated();
        unsubscribeLocation();
      };
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

// ==================== HOOKS ====================
export const useEmployeeDashboard = () => {
  const store = useEmployeeDashboardStore();
  
  return {
    // State
    stats: store.stats,
    employeeInfo: store.employeeInfo,
    assignedTasks: store.assignedTasks,
    isLoading: store.isLoading,
    error: store.error,
    lastUpdated: store.lastUpdated,
    
    // Actions
    fetchEmployeeData: store.fetchEmployeeData,
    refreshAll: store.refreshAll,
    clearError: store.clearError,
  };
};
