// 📍 LOCATION API SERVICE
// Harita verileri ve konum kontrolü için API çağrıları

import { apiClient } from './client';
import { MapData, EmployeeLocation, LocationCheck } from '../../types';
import { API_ENDPOINTS } from '../../constants';

class LocationApi {
  // ==================== Harita Verileri (Admin) ====================
  async getMapData(date?: string): Promise<MapData> {
    try {
      const url = date 
        ? `${API_ENDPOINTS.LOCATION_MAP}?date=${date}`
        : API_ENDPOINTS.LOCATION_MAP;

      const response = await apiClient.get<{ success: boolean; data: MapData }>(url);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Harita verileri alınamadı');
    } catch (error: any) {
      console.error('❌ Get map data error:', error);
      throw error;
    }
  }

  // ==================== Çalışan Konum Güncelleme ====================
  async updateEmployeeLocation(data: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    maintenance_schedule_id?: number;
  }): Promise<{ success: boolean; data: { location: EmployeeLocation } }> {
    try {
      return await apiClient.post<{ success: boolean; data: { location: EmployeeLocation } }>(
        API_ENDPOINTS.EMPLOYEE_LOCATION_UPDATE,
        data
      );
    } catch (error: any) {
      console.error('❌ Update employee location error:', error);
      throw error;
    }
  }

  // ==================== Konum Kontrolü Sonuçları ====================
  async getLocationChecks(maintenanceScheduleId: number): Promise<LocationCheck[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: LocationCheck[] }>(
        API_ENDPOINTS.LOCATION_CHECKS(maintenanceScheduleId)
      );
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error: any) {
      console.error('❌ Get location checks error:', error);
      throw error;
    }
  }
}

export const locationApi = new LocationApi();