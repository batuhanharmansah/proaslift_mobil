// 🏢 ENTERPRISE BUILDINGS STATE MANAGEMENT
// Bina ve asansör yönetimi, filtreleme, arama

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { apiClient, isRequestCancelled } from '../services/api/client';
import { API_ENDPOINTS } from '../constants';
import { Building, BuildingFilters, LoadingState, PaginatedResponse } from '../types';

interface BuildingsState extends LoadingState {
  // State
  buildings: Building[];
  selectedBuilding: Building | null;
  filters: BuildingFilters;
  pagination: {
    currentPage: number;
    lastPage: number;
    total: number;
  };
  
  // Actions
  fetchBuildings: (page?: number, filters?: BuildingFilters, signal?: AbortSignal) => Promise<void>;
  fetchBuildingDetail: (id: number) => Promise<Building>;
  selectBuilding: (building: Building | null) => void;
  setFilters: (filters: BuildingFilters) => void;
  clearFilters: () => void;
  refreshBuildings: () => Promise<void>;
  
  // Search & Filter
  searchBuildings: (query: string) => void;
  filterByStatus: (status: string) => void;
  filterByDistrict: (district: string) => void;
  
  // Utility actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useBuildingsStore = create<BuildingsState>()(
  subscribeWithSelector((set, get) => ({
    // ==================== INITIAL STATE ====================
    buildings: [],
    selectedBuilding: null,
    filters: {},
    pagination: {
      currentPage: 1,
      lastPage: 1,
      total: 0,
    },
    isLoading: false,
    error: null,

    // ==================== FETCH BUILDINGS ====================
    fetchBuildings: async (page = 1, filters?: BuildingFilters, signal?: AbortSignal) => {
      const { setLoading, setError, clearError } = get();

      try {
        setLoading(true);
        clearError();

        const currentFilters = filters || get().filters;

        // Query parameters oluştur
        const params = new URLSearchParams({
          page: page.toString(),
          ...currentFilters,
        });

        const response = await apiClient.get<PaginatedResponse<Building> & {
          pagination?: { current_page?: number; last_page?: number; total?: number };
        }>(`${API_ENDPOINTS.BUILDINGS}?${params}`, { signal });

        if (signal?.aborted) return;

        const body = response as PaginatedResponse<Building> & {
          pagination?: { current_page?: number; last_page?: number; total?: number };
        };
        const rawList = body?.data;
        const list: Building[] = Array.isArray(rawList) ? rawList : [];
        const pg = body.pagination;
        const currentPage =
          (typeof pg?.current_page === 'number' ? pg.current_page : undefined) ??
          body.current_page ??
          page;
        const lastPage =
          (typeof pg?.last_page === 'number' ? pg.last_page : undefined) ??
          body.last_page ??
          1;
        const total =
          (typeof pg?.total === 'number' ? pg.total : undefined) ??
          body.total ??
          list.length;

        set({
          buildings: page === 1 ? list : [...get().buildings, ...list],
          pagination: {
            currentPage,
            lastPage,
            total,
          },
          filters: currentFilters,
          isLoading: false,
        });

      } catch (error: any) {
        if (isRequestCancelled(error)) {
          set({ isLoading: false });
          return;
        }
        console.error('❌ Buildings fetch error:', error);
        setError(error.message || 'Binalar yüklenemedi');
        set({ isLoading: false });
      }
    },

    // ==================== FETCH BUILDING DETAIL ====================
    fetchBuildingDetail: async (id: number) => {
      try {
        const response = await apiClient.get<{ data: Building }>(
          API_ENDPOINTS.BUILDING_DETAIL(id)
        );

        const building = response.data;
        
        // Cache'e ekle
        set(state => ({
          buildings: state.buildings.map(b => 
            b.id === id ? building : b
          ),
        }));

        return building;
      } catch (error: any) {
        console.error('❌ Building detail fetch error:', error);
        throw error;
      }
    },

    // ==================== SELECT BUILDING ====================
    selectBuilding: (building: Building | null) => {
      set({ selectedBuilding: building });
    },

    // ==================== FILTERS ====================
    setFilters: (filters: BuildingFilters) => {
      set({ filters });
    },

    clearFilters: () => {
      set({ filters: {} });
    },

    searchBuildings: (query: string) => {
      const newFilters = { ...get().filters, search: query };
      set({ filters: newFilters });
      get().fetchBuildings(1, newFilters);
    },

    filterByStatus: (status: string) => {
      const newFilters = { ...get().filters, status };
      set({ filters: newFilters });
      get().fetchBuildings(1, newFilters);
    },

    filterByDistrict: (district: string) => {
      const newFilters = { ...get().filters, district };
      set({ filters: newFilters });
      get().fetchBuildings(1, newFilters);
    },

    // ==================== REFRESH ====================
    refreshBuildings: async () => {
      const { fetchBuildings, filters } = get();
      await fetchBuildings(1, filters);
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
export const buildingsSelectors = {
  buildings: (state: BuildingsState) => state.buildings,
  selectedBuilding: (state: BuildingsState) => state.selectedBuilding,
  filters: (state: BuildingsState) => state.filters,
  pagination: (state: BuildingsState) => state.pagination,
  isLoading: (state: BuildingsState) => state.isLoading,
  error: (state: BuildingsState) => state.error,
  
  // Computed selectors
  activeBuildings: (state: BuildingsState) => 
    state.buildings.filter(b => b.status === 'aktif'),
  
  buildingsByDistrict: (state: BuildingsState) => 
    state.buildings.reduce((acc, building) => {
      const district = building.district;
      if (!acc[district]) acc[district] = [];
      acc[district].push(building);
      return acc;
    }, {} as Record<string, Building[]>),
    
  criticalBuildings: (state: BuildingsState) =>
    state.buildings.filter(b => 
      b.operational_status === 'arizali' || 
      b.operational_status === 'muhurlendi'
    ),
    
  hasMore: (state: BuildingsState) => 
    state.pagination.currentPage < state.pagination.lastPage,
};

// ==================== HOOKS ====================
export const useBuildings = () => {
  const store = useBuildingsStore();
  
  return {
    // State
    buildings: store.buildings,
    selectedBuilding: store.selectedBuilding,
    filters: store.filters,
    pagination: store.pagination,
    isLoading: store.isLoading,
    error: store.error,
    
    // Computed
    activeBuildings: buildingsSelectors.activeBuildings(store),
    buildingsByDistrict: buildingsSelectors.buildingsByDistrict(store),
    criticalBuildings: buildingsSelectors.criticalBuildings(store),
    hasMore: buildingsSelectors.hasMore(store),
    
    // Actions
    fetchBuildings: store.fetchBuildings,
    fetchBuildingDetail: store.fetchBuildingDetail,
    selectBuilding: store.selectBuilding,
    setFilters: store.setFilters,
    clearFilters: store.clearFilters,
    searchBuildings: store.searchBuildings,
    filterByStatus: store.filterByStatus,
    filterByDistrict: store.filterByDistrict,
    refreshBuildings: store.refreshBuildings,
    clearError: store.clearError,
  };
};
