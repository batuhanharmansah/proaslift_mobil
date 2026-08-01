// 📍 LOCATION SERVICE - Konum Takibi (Sadece Aktif Bakım Görevi)
// Konum SADECE teknisyenin üzerinde aktif bakım görevi varken alınır; rapor tamamlanınca otomatik durur.
// Foreground only; jobId zorunlu.

import * as Location from 'expo-location';
import { apiClient } from '../api/client';
import { EmployeeLocation } from '../../types';
import { API_ENDPOINTS } from '../../constants';

const LOCATION_UPDATE_INTERVAL = 15000; // 15 saniye
const LOCATION_DISTANCE_INTERVAL = 30; // 30 metre

export interface TrackingState {
  active: boolean;
  jobId?: number;
}

class LocationService {
  private isTracking = false;
  private currentJobId: number | undefined = undefined;
  private locationSubscription: Location.LocationSubscription | null = null;
  private lastUpdateTime: Date | null = null;

  // ==================== İzin (Sadece Foreground) ====================
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        if (newStatus !== 'granted') {
          console.warn('❌ Foreground location permission denied');
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('❌ Location permission error:', error);
      return false;
    }
  }

  // ==================== Mevcut Konumu Alma ====================
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
      });
      return location;
    } catch (error) {
      console.error('❌ Get current location error:', error);
      return null;
    }
  }

  // ==================== Konum Gönderme (jobId zorunlu) ====================
  async updateLocationToServer(
    latitude: number,
    longitude: number,
    jobId: number,
    accuracy?: number
  ): Promise<EmployeeLocation | null> {
    if (!jobId) {
      console.warn('⚠️ updateLocationToServer: jobId required, skipping');
      return null;
    }
    try {
      const response = await apiClient.post<{ success: boolean; data: { location: EmployeeLocation } }>(
        API_ENDPOINTS.EMPLOYEE_LOCATION_UPDATE,
        {
          latitude,
          longitude,
          accuracy,
          maintenance_schedule_id: jobId,
        }
      );
      if (response?.success && response?.data?.location) {
        this.lastUpdateTime = new Date();
        return response.data.location;
      }
      return null;
    } catch (error: any) {
      console.error('❌ Update location to server error:', error?.message);
      return null;
    }
  }

  // ==================== Takip Başlat (Sadece jobId ile; foreground) ====================
  async startTracking(options: { jobId: number }): Promise<void> {
    const { jobId } = options;
    if (!jobId) {
      console.warn('⚠️ startTracking: jobId required');
      return;
    }
    if (this.isTracking && this.currentJobId === jobId) {
      return;
    }
    if (this.isTracking) {
      this.stopTracking();
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Konum izni verilmedi. Lütfen ayarlardan izin verin.');
    }

    this.isTracking = true;
    this.currentJobId = jobId;

    const initialLocation = await this.getCurrentLocation();
    if (initialLocation) {
      await this.updateLocationToServer(
        initialLocation.coords.latitude,
        initialLocation.coords.longitude,
        jobId,
        initialLocation.coords.accuracy ?? undefined
      );
    }

    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_UPDATE_INTERVAL,
        distanceInterval: LOCATION_DISTANCE_INTERVAL,
      },
      async (location) => {
        if (!this.currentJobId) return;
        await this.updateLocationToServer(
          location.coords.latitude,
          location.coords.longitude,
          this.currentJobId,
          location.coords.accuracy ?? undefined
        );
      }
    );
  }

  // ==================== Takip Durdur ====================
  stopTracking(): void {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    const wasJobId = this.currentJobId;
    this.isTracking = false;
    this.currentJobId = undefined;
  }

  // ==================== Durum ====================
  isTrackingEnabled(): boolean {
    return this.isTracking;
  }

  getTrackingState(): TrackingState {
    return {
      active: this.isTracking,
      jobId: this.currentJobId,
    };
  }

  getLastUpdateTime(): Date | null {
    return this.lastUpdateTime;
  }

  async getPermissionStatus(): Promise<{
    foreground: Location.PermissionStatus;
    background: Location.PermissionStatus | null;
    isGranted: boolean;
  }> {
    try {
      const status = await Location.getForegroundPermissionsAsync();
      return {
        foreground: status.status,
        background: null,
        isGranted: status.status === 'granted',
      };
    } catch (error) {
      return { foreground: 'undetermined', background: null, isGranted: false };
    }
  }

  cleanup(): void {
    this.stopTracking();
  }
}

export const locationService = new LocationService();
