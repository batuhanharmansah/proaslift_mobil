// 🏪 ENTERPRISE STATE MANAGEMENT - AUTH STORE
// Zustand ile merkezi durum yönetimi

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { User, LoginCredentials, LoadingState } from '../types';
import { AuthService } from '../services/auth/AuthService';
import { locationService } from '../services/location/LocationService';
import { biometricService } from '../services/auth/BiometricService';
import { StorageService } from '../services/storage/StorageService';

interface AuthState extends LoadingState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isEmployee: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  
  // Utility actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    // ==================== INITIAL STATE ====================
    user: null,
    isAuthenticated: false,
    isEmployee: false,
    isLoading: false,
    error: null,

    // ==================== LOGIN ACTION ====================
    login: async (credentials: LoginCredentials) => {
      const { setLoading, setError, clearError } = get();
      
      try {
        setLoading(true);
        clearError();
        const response = await AuthService.login(credentials);

        if (response?.success && response?.data) {
          // Backend'den gelen is_employee field'ını kontrol et
          // Önce response.data.is_employee, sonra response.data.user.is_employee, son olarak employee position'a bak
          let isEmployee = false;
          if (response.data?.is_employee !== undefined) {
            isEmployee = response.data.is_employee;
          } else if (response.data?.user?.is_employee !== undefined) {
            isEmployee = response.data.user.is_employee;
          } else if (response.data?.user?.employee) {
            // Employee objesi varsa, position'a bak
            // position === 'yonetici' ise admin (isEmployee: false), değilse employee (isEmployee: true)
            const position = response.data.user.employee.position;
            isEmployee = position !== 'yonetici' && position !== 'admin';
          } else {
            isEmployee = false;
          }

          set({
            user: response.data!.user,
            isAuthenticated: true,
            isEmployee,
            isLoading: false,
          });
        } else {
          throw new Error(response?.message || 'Giriş başarısız');
        }
      } catch (error: any) {
        setError(error.message || 'Giriş sırasında hata oluştu');
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        throw error;
      }
    },

    // ==================== LOGOUT ACTION ====================
    logout: async () => {
      const { setLoading, clearError } = get();
      
      try {
        setLoading(true);
        clearError();

        // Logout öncesi konum takibini durdur
        try {
          locationService.stopTracking();
        } catch (error) {
          // ignore
        }

        // Biometric credentials'ı sil (kullanıcı çıkış yapıyor)
        try {
          await biometricService.deleteCredentials();
        } catch (error) {
          // ignore
        }

        await AuthService.logout();
        
        set({
          user: null,
          isAuthenticated: false,
          isEmployee: false,
          isLoading: false,
          error: null,
        });
        
      } catch (error: any) {
        // Logout hatası olsa bile local state'i temizle ve konum takibini durdur
        try {
          locationService.stopTracking();
        } catch (locError) {
          // ignore
        }
        try {
          await biometricService.deleteCredentials();
        } catch (bioError) {
          // ignore
        }
        set({
          user: null,
          isAuthenticated: false,
          isEmployee: false,
          isLoading: false,
        });
      }
    },

    // ==================== REFRESH USER ACTION ====================
    refreshUser: async () => {
      try {
        const user = await AuthService.getCurrentUser();
        
        if (user) {
          set({
            user,
            isAuthenticated: true,
          });
        } else {
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      } catch (error: any) {
        set({
          user: null,
          isAuthenticated: false,
        });
      }
    },

    // ==================== UPDATE USER ACTION ====================
    updateUser: async (userData: Partial<User>) => {
      const { setLoading, setError, clearError } = get();
      
      try {
        setLoading(true);
        clearError();

        const updatedUser = await AuthService.updateProfile(userData);
        
        set({
          user: updatedUser,
          isLoading: false,
        });
        
      } catch (error: any) {
        setError(error.message || 'Kullanıcı güncellenemedi');
        set({ isLoading: false });
        throw error;
      }
    },

    // ==================== CHECK AUTH STATUS ====================
    checkAuthStatus: async () => {
      const currentState = get();
      
      // Eğer zaten authenticated ise, tekrar kontrol etme (login sonrası state korunmalı)
      if (currentState.isAuthenticated && currentState.user) {
        return;
      }

      try {
        const token = await StorageService.getToken();
        if (token) {
          try {
            const user = await AuthService.getCurrentUser();
            if (user) {
              let isEmployee = false;
              if ((user as any).is_employee !== undefined) {
                isEmployee = (user as any).is_employee;
              } else if (user.employee) {
                const position = user.employee.position;
                isEmployee = position !== 'yonetici' && position !== 'admin';
              } else {
                isEmployee = false;
              }
              set({
                user,
                isAuthenticated: true,
                isEmployee,
              });
            }
          } catch (error) {
            await StorageService.clearAuth();
            set({
              user: null,
              isAuthenticated: false,
              isEmployee: false,
            });
          }
        } else {
          // Token yoksa sessizce false set et
          set({
            user: null,
            isAuthenticated: false,
            isEmployee: false,
          });
        }
      } catch (error: any) {
        // Hata durumunda auth state'i sıfırla (ama authenticated ise koru)
        if (!currentState.isAuthenticated) {
          set({
            user: null,
            isAuthenticated: false,
            isEmployee: false,
          });
        }
      }
    },

    // ==================== UTILITY ACTIONS ====================
    setLoading: (loading: boolean) => {
      set({ isLoading: loading });
    },

    setError: (error: string | null) => {
      set({ error });
    },

    clearError: () => {
      set({ error: null });
    },
  }))
);

// ==================== SELECTORS ====================
export const authSelectors = {
  user: (state: AuthState) => state.user,
  isAuthenticated: (state: AuthState) => state.isAuthenticated,
  isLoading: (state: AuthState) => state.isLoading,
  error: (state: AuthState) => state.error,
  companyId: (state: AuthState) => state.user?.company_id || null,
  userId: (state: AuthState) => state.user?.id || null,
};

// ==================== HOOKS ====================
export const useAuth = () => {
  const store = useAuthStore();
  
  return {
    // State
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isEmployee: store.isEmployee,
    isLoading: store.isLoading,
    error: store.error,
    
    // Computed
    companyId: store.user?.company_id || null,
    userId: store.user?.id || null,
    userName: store.user?.name || '',
    userEmail: store.user?.email || '',
    
    // Actions
    login: store.login,
    logout: store.logout,
    refreshUser: store.refreshUser,
    updateUser: store.updateUser,
    checkAuthStatus: store.checkAuthStatus,
    setLoading: store.setLoading,
    clearError: store.clearError,
  };
};
