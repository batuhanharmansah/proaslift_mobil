# 📱 Mobil Uygulamada Konum Takibi - Detaylı Uygulama Planı

## 🎯 Genel Bakış

Bu doküman, web'de geliştirdiğimiz konum takibi özelliklerinin mobil uygulamaya nasıl uygulanacağını adım adım açıklar.

### 🏗️ Mimari Yapı

```
Mobile App (React Native + Expo)
├── Admin Side (Company Admin)
│   ├── Location Map Screen (Harita görünümü)
│   ├── Today's Jobs Screen (Bugünün işleri)
│   └── Location Checks Screen (Konum kontrolü sonuçları)
│
└── Employee Side (Field Employee)
    ├── Background Location Service (Arka plan konum takibi)
    ├── Location Update Screen (Konum güncelleme)
    └── Active Job Screen (Aktif iş ekranı)
```

---

## 📋 ADIM 1: Gerekli Paketlerin Kurulumu

### 1.1. Expo Location Paketi
```bash
cd asansor-mobile
npx expo install expo-location
```

### 1.2. Expo Task Manager (Background Location için)
```bash
npx expo install expo-task-manager
```

### 1.3. React Native Maps (Harita görünümü için)
```bash
npx expo install react-native-maps
# veya
npm install react-native-maps
```

### 1.4. app.json İzinleri Güncelleme
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Çalışanların konumunu takip etmek için konum erişimi gereklidir",
        "NSLocationAlwaysUsageDescription": "Arka planda konum takibi için konum erişimi gereklidir",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Konum takibi için konum erişimi gereklidir"
      }
    },
    "android": {
      "permissions": [
        "CAMERA",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION"
      ]
    }
  }
}
```

---

## 📋 ADIM 2: Type Definitions (TypeScript Tipleri)

### 2.1. src/types/index.ts - Yeni Tipler Ekle

```typescript
// ==================== LOCATION TYPES ====================
export interface EmployeeLocation {
  id: number;
  employee_id: number;
  maintenance_schedule_id?: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  employee?: Employee;
  maintenanceSchedule?: MaintenanceSchedule;
}

export interface LocationCheck {
  id: number;
  company_id: number;
  employee_id: number;
  building_id: number;
  maintenance_schedule_id: number;
  check_type: 'arrival' | 'departure';
  scheduled_time: string;
  actual_time?: string;
  employee_latitude?: number;
  employee_longitude?: number;
  building_latitude: number;
  building_longitude: number;
  distance_from_building?: number; // metre cinsinden
  time_difference_minutes?: number;
  status: 'on_time' | 'late' | 'early' | 'pending';
  is_on_time: boolean;
  created_at: string;
  updated_at: string;
  employee?: Employee;
  building?: Building;
  maintenanceSchedule?: MaintenanceSchedule;
}

export interface MapData {
  buildings: BuildingWithCoordinates[];
  buildings_without_coordinates: Building[];
  employees: ActiveEmployee[];
  today_schedules: MaintenanceScheduleWithLocation[];
  selected_date: string;
  location_checks: LocationCheck[];
}

export interface BuildingWithCoordinates extends Building {
  coordinates: {
    lat: number;
    lng: number;
  };
  has_coordinates: boolean;
}

export interface ActiveEmployee {
  id: number;
  name: string;
  position: string;
  phone: string;
  coordinates: {
    lat: number;
    lng: number;
  } | null;
  last_update: string;
  active_maintenance: {
    id: number;
    building_id: number;
    building_name: string;
    scheduled_time: string;
    estimated_duration: number;
    status: string;
  } | null;
  location_checks: {
    arrival?: LocationCheck;
    departure?: LocationCheck;
  };
}

export interface MaintenanceScheduleWithLocation extends MaintenanceSchedule {
  building: BuildingWithCoordinates;
  assigned_employee: Employee | null;
  scheduled_time_display: string | null; // "14:30" format
  estimated_end_time: string | null;
}
```

---

## 📋 ADIM 3: Location Service (Servis Katmanı)

### 3.1. src/services/location/LocationService.ts

```typescript
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { apiClient } from '../api/client';
import { EmployeeLocation } from '../../types';

const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_UPDATE_INTERVAL = 30000; // 30 saniye

class LocationService {
  private isTracking = false;
  private locationSubscription: Location.LocationSubscription | null = null;

  // ==================== İzin Kontrolü ====================
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.error('❌ Foreground location permission denied');
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.warn('⚠️ Background location permission denied (will use foreground)');
      }

      return true;
    } catch (error) {
      console.error('❌ Location permission error:', error);
      return false;
    }
  }

  // ==================== Konum Alma ====================
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

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

  // ==================== Konum Güncelleme (API'ye Gönderme) ====================
  async updateLocationToServer(
    latitude: number,
    longitude: number,
    accuracy?: number,
    maintenanceScheduleId?: number
  ): Promise<EmployeeLocation | null> {
    try {
      const response = await apiClient.post('/api/employee/location/update', {
        latitude,
        longitude,
        accuracy,
        maintenance_schedule_id: maintenanceScheduleId,
      });

      return response.data.location;
    } catch (error: any) {
      console.error('❌ Update location to server error:', error);
      throw error;
    }
  }

  // ==================== Foreground Location Tracking ====================
  async startForegroundTracking(maintenanceScheduleId?: number): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      this.isTracking = true;

      // Konum güncellemelerini dinle
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: LOCATION_UPDATE_INTERVAL, // 30 saniye
          distanceInterval: 50, // 50 metre
        },
        async (location) => {
          // Sunucuya konum gönder
          try {
            await this.updateLocationToServer(
              location.coords.latitude,
              location.coords.longitude,
              location.coords.accuracy || undefined,
              maintenanceScheduleId
            );
            console.log('✅ Location updated:', location.coords.latitude, location.coords.longitude);
          } catch (error) {
            console.error('❌ Failed to update location to server:', error);
          }
        }
      );

      console.log('✅ Foreground location tracking started');
    } catch (error) {
      console.error('❌ Start foreground tracking error:', error);
      this.isTracking = false;
      throw error;
    }
  }

  // ==================== Tracking Durdurma ====================
  stopTracking(): void {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.isTracking = false;
    console.log('✅ Location tracking stopped');
  }

  // ==================== Status ====================
  isTrackingEnabled(): boolean {
    return this.isTracking;
  }
}

// Background Location Task (İleri seviye - opsiyonel)
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('❌ Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (location) {
      try {
        // Sunucuya konum gönder
        await apiClient.post('/api/employee/location/update', {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || undefined,
        });
        console.log('✅ Background location updated');
      } catch (error) {
        console.error('❌ Background location update failed:', error);
      }
    }
  }
});

export const locationService = new LocationService();
```

---

## 📋 ADIM 4: API Endpoints (Backend Entegrasyonu)

### 4.1. src/services/api/locationApi.ts

```typescript
import { apiClient } from './client';
import { MapData, EmployeeLocation, LocationCheck } from '../../types';
import { API_ENDPOINTS } from '../../constants';

class LocationApi {
  // ==================== Harita Verileri (Admin) ====================
  async getMapData(date?: string): Promise<MapData> {
    const url = date 
      ? `${API_ENDPOINTS.LOCATION_MAP}?date=${date}`
      : API_ENDPOINTS.LOCATION_MAP;

    const response = await apiClient.get<{ success: boolean; data: MapData }>(url);
    return response.data;
  }

  // ==================== Çalışan Konum Güncelleme ====================
  async updateEmployeeLocation(data: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    maintenance_schedule_id?: number;
  }): Promise<{ success: boolean; data: { location: EmployeeLocation } }> {
    return await apiClient.post(API_ENDPOINTS.EMPLOYEE_LOCATION_UPDATE, data);
  }

  // ==================== Konum Kontrolü Sonuçları ====================
  async getLocationChecks(maintenanceScheduleId: number): Promise<LocationCheck[]> {
    const response = await apiClient.get<{ success: boolean; data: LocationCheck[] }>(
      `${API_ENDPOINTS.LOCATION_CHECKS}/${maintenanceScheduleId}`
    );
    return response.data;
  }
}

export const locationApi = new LocationApi();
```

### 4.2. src/constants/index.ts - Endpoint'leri Ekle

```typescript
export const API_ENDPOINTS = {
  // ... mevcut endpoints
  LOCATION_MAP: '/api/location-map/data',
  EMPLOYEE_LOCATION_UPDATE: '/api/employee/location/update',
  LOCATION_CHECKS: '/api/location-map/location-checks',
} as const;
```

---

## 📋 ADIM 5: ÇALIŞAN TARAFI (Employee Side)

### 5.1. Active Job Screen (Aktif İş Ekranı)

**src/screens/maintenance/ActiveJobScreen.tsx**

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { MaintenanceSchedule } from '../../types';
import { locationService } from '../../services/location/LocationService';
import { locationApi } from '../../services/api/locationApi';
import { COLORS } from '../../constants';
import { hapticFeedback } from '../../utils';

interface Props {
  route: {
    params: {
      maintenanceScheduleId: number;
      maintenanceSchedule: MaintenanceSchedule;
    };
  };
  navigation: any;
}

const ActiveJobScreen: React.FC<Props> = ({ route, navigation }) => {
  const { maintenanceScheduleId, maintenanceSchedule } = route.params;
  
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [arrivalCheck, setArrivalCheck] = useState<any>(null);
  const [departureCheck, setDepartureCheck] = useState<any>(null);

  // ==================== Konum Takibini Başlat/Durdur ====================
  const toggleLocationTracking = async () => {
    try {
      if (isLocationTracking) {
        // Durdur
        locationService.stopTracking();
        setIsLocationTracking(false);
        await hapticFeedback.success();
        Alert.alert('Konum Takibi', 'Konum takibi durduruldu');
      } else {
        // Başlat
        const hasPermission = await locationService.requestPermissions();
        if (!hasPermission) {
          Alert.alert(
            'İzin Gerekli',
            'Konum takibi için konum izni gereklidir. Lütfen ayarlardan izin verin.',
            [
              { text: 'Tamam', style: 'default' },
            ]
          );
          return;
        }

        await locationService.startForegroundTracking(maintenanceScheduleId);
        setIsLocationTracking(true);
        await hapticFeedback.success();
        Alert.alert('Konum Takibi', 'Konum takibi başlatıldı');
      }
    } catch (error: any) {
      console.error('Location tracking toggle error:', error);
      Alert.alert('Hata', error.message || 'Konum takibi başlatılamadı');
      await hapticFeedback.error();
    }
  };

  // ==================== Konum Kontrolü ====================
  useFocusEffect(
    useCallback(() => {
      loadLocationChecks();

      // Her 10 saniyede bir konum kontrolü yap
      const interval = setInterval(() => {
        if (isLocationTracking) {
          loadLocationChecks();
        }
      }, 10000);

      return () => clearInterval(interval);
    }, [isLocationTracking])
  );

  const loadLocationChecks = async () => {
    try {
      const checks = await locationApi.getLocationChecks(maintenanceScheduleId);
      
      // Arrival ve departure check'leri ayır
      const arrival = checks.find(c => c.check_type === 'arrival');
      const departure = checks.find(c => c.check_type === 'departure');

      setArrivalCheck(arrival);
      setDepartureCheck(departure);
    } catch (error) {
      console.error('Load location checks error:', error);
    }
  };

  // ==================== Görünüm ====================
  return (
    <ScrollView style={styles.container}>
      {/* İş Bilgileri */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 İş Bilgileri</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Bina:</Text>
          <Text style={styles.value}>{maintenanceSchedule.building?.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Adres:</Text>
          <Text style={styles.value}>{maintenanceSchedule.building?.address}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Planlanan Saat:</Text>
          <Text style={styles.value}>
            {maintenanceSchedule.scheduled_time_display || 'Belirtilmemiş'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Tahmini Süre:</Text>
          <Text style={styles.value}>
            {maintenanceSchedule.estimated_duration 
              ? `${Math.floor(maintenanceSchedule.estimated_duration / 60)} saat ${maintenanceSchedule.estimated_duration % 60} dakika`
              : 'Belirtilmemiş'}
          </Text>
        </View>
      </View>

      {/* Konum Takibi */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Ionicons 
              name={isLocationTracking ? "location" : "location-outline"} 
              size={24} 
              color={isLocationTracking ? COLORS.primary[500] : COLORS.gray[500]} 
            />
            <Text style={styles.switchLabel}>Konum Takibi</Text>
          </View>
          <Switch
            value={isLocationTracking}
            onValueChange={toggleLocationTracking}
            trackColor={{ false: COLORS.gray[300], true: COLORS.primary[300] }}
            thumbColor={isLocationTracking ? COLORS.primary[500] : COLORS.gray[400]}
          />
        </View>

        {isLocationTracking && (
          <View style={styles.trackingInfo}>
            <Text style={styles.trackingText}>
              ✅ Konum takibi aktif - Her 30 saniyede bir güncelleniyor
            </Text>
            {lastUpdateTime && (
              <Text style={styles.lastUpdateText}>
                Son güncelleme: {lastUpdateTime.toLocaleTimeString('tr-TR')}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Konum Kontrolü Sonuçları */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Konum Kontrolü</Text>

        {/* Geliş Kontrolü */}
        <View style={styles.checkCard}>
          <View style={styles.checkHeader}>
            <Ionicons name="checkmark-circle" size={24} color={arrivalCheck?.is_on_time ? COLORS.green[500] : COLORS.red[500]} />
            <Text style={styles.checkTitle}>Geliş Kontrolü</Text>
          </View>
          
          {arrivalCheck ? (
            <View style={styles.checkDetails}>
              <View style={styles.checkRow}>
                <Text style={styles.checkLabel}>Planlanan:</Text>
                <Text style={styles.checkValue}>
                  {new Date(arrivalCheck.scheduled_time).toLocaleString('tr-TR')}
                </Text>
              </View>
              {arrivalCheck.actual_time && (
                <View style={styles.checkRow}>
                  <Text style={styles.checkLabel}>Gerçek:</Text>
                  <Text style={styles.checkValue}>
                    {new Date(arrivalCheck.actual_time).toLocaleString('tr-TR')}
                  </Text>
                </View>
              )}
              <View style={styles.checkRow}>
                <Text style={styles.checkLabel}>Durum:</Text>
                <Text style={[
                  styles.checkValue,
                  { color: arrivalCheck.is_on_time ? COLORS.green[600] : COLORS.red[600] }
                ]}>
                  {arrivalCheck.is_on_time ? '✅ Zamanında' : '❌ Geç'}
                </Text>
              </View>
              {arrivalCheck.time_difference_minutes !== null && (
                <View style={styles.checkRow}>
                  <Text style={styles.checkLabel}>Fark:</Text>
                  <Text style={styles.checkValue}>
                    {arrivalCheck.time_difference_minutes} dakika
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.checkPending}>Henüz kontrol edilmedi</Text>
          )}
        </View>

        {/* Ayrılış Kontrolü */}
        <View style={styles.checkCard}>
          <View style={styles.checkHeader}>
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color={departureCheck?.is_on_time ? COLORS.green[500] : departureCheck ? COLORS.red[500] : COLORS.gray[400]} 
            />
            <Text style={styles.checkTitle}>Ayrılış Kontrolü</Text>
          </View>
          
          {departureCheck ? (
            <View style={styles.checkDetails}>
              <View style={styles.checkRow}>
                <Text style={styles.checkLabel}>Planlanan:</Text>
                <Text style={styles.checkValue}>
                  {new Date(departureCheck.scheduled_time).toLocaleString('tr-TR')}
                </Text>
              </View>
              {departureCheck.actual_time && (
                <View style={styles.checkRow}>
                  <Text style={styles.checkLabel}>Gerçek:</Text>
                  <Text style={styles.checkValue}>
                    {new Date(departureCheck.actual_time).toLocaleString('tr-TR')}
                  </Text>
                </View>
              )}
              <View style={styles.checkRow}>
                <Text style={styles.checkLabel}>Durum:</Text>
                <Text style={[
                  styles.checkValue,
                  { color: departureCheck.is_on_time ? COLORS.green[600] : COLORS.red[600] }
                ]}>
                  {departureCheck.is_on_time ? '✅ Zamanında' : '❌ Geç'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.checkPending}>İş bitene kadar bekleniyor</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  label: {
    fontSize: 14,
    color: COLORS.gray[600],
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: COLORS.gray[900],
    flex: 1,
    textAlign: 'right',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  trackingInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.primary[50],
    borderRadius: 8,
  },
  trackingText: {
    fontSize: 14,
    color: COLORS.primary[700],
    fontWeight: '500',
  },
  lastUpdateText: {
    fontSize: 12,
    color: COLORS.gray[600],
    marginTop: 4,
  },
  checkCard: {
    marginTop: 12,
    padding: 16,
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  checkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  checkDetails: {
    gap: 8,
  },
  checkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  checkLabel: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  checkValue: {
    fontSize: 14,
    color: COLORS.gray[900],
    fontWeight: '500',
  },
  checkPending: {
    fontSize: 14,
    color: COLORS.gray[500],
    fontStyle: 'italic',
  },
});

export default ActiveJobScreen;
```

---

## 📋 ADIM 6: ADMIN TARAFI (Admin Side)

### 6.1. Location Map Screen (Harita Görünümü)

**src/screens/location/LocationMapScreen.tsx**

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { locationApi } from '../../services/api/locationApi';
import { MapData, MaintenanceScheduleWithLocation, ActiveEmployee } from '../../types';
import { COLORS } from '../../constants';
import { hapticFeedback } from '../../utils';

const { width, height } = Dimensions.get('window');

const LocationMapScreen: React.FC = () => {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [region, setRegion] = useState({
    latitude: 41.0082,
    longitude: 28.9784,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  // ==================== Harita Verilerini Yükle ====================
  const loadMapData = async () => {
    try {
      setIsLoading(true);
      const data = await locationApi.getMapData(selectedDate);
      setMapData(data);

      // Haritayı tüm marker'lara göre ayarla
      if (data.buildings.length > 0 || data.employees.length > 0 || data.today_schedules.length > 0) {
        // İlk binanın veya işin konumuna odaklan
        const firstLocation = data.today_schedules[0]?.building?.coordinates ||
                              data.buildings[0]?.coordinates ||
                              data.employees[0]?.coordinates;

        if (firstLocation) {
          setRegion({
            latitude: firstLocation.lat,
            longitude: firstLocation.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      }
    } catch (error: any) {
      console.error('Load map data error:', error);
      Alert.alert('Hata', error.message || 'Harita verileri yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMapData();

      // Her 30 saniyede bir otomatik yenile
      const interval = setInterval(() => {
        loadMapData();
      }, 30000);

      return () => clearInterval(interval);
    }, [selectedDate])
  );

  // ==================== Tarih Değiştirme ====================
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    loadMapData();
  };

  // ==================== Marker Renkleri (İş Durumuna Göre) ====================
  const getScheduleMarkerColor = (status: string): string => {
    switch (status) {
      case 'planli':
      case 'atandi':
        return '#9333ea'; // Mor
      case 'baslandi':
        return '#3b82f6'; // Mavi
      case 'tamamlandi':
        return '#10b981'; // Yeşil
      case 'ertelendi':
        return '#f59e0b'; // Sarı
      default:
        return '#94a3b8'; // Gri
    }
  };

  // ==================== Görünüm ====================
  return (
    <View style={styles.container}>
      {/* Üst Bilgi Barı */}
      <View style={styles.header}>
        <View style={styles.dateSelector}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.primary[600]} />
          <Text style={styles.dateText}>
            {new Date(selectedDate).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            setRefreshing(true);
            loadMapData().finally(() => setRefreshing(false));
            hapticFeedback.light();
          }}
        >
          <Ionicons name="refresh" size={24} color={COLORS.primary[600]} />
        </TouchableOpacity>
      </View>

      {/* İstatistikler */}
      <ScrollView 
        horizontal 
        style={styles.statsContainer}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{mapData?.today_schedules.length || 0}</Text>
          <Text style={styles.statLabel}>Bugünün İşleri</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{mapData?.employees.length || 0}</Text>
          <Text style={styles.statLabel}>Sahada Çalışanlar</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{mapData?.buildings.length || 0}</Text>
          <Text style={styles.statLabel}>Binalar</Text>
        </View>
      </ScrollView>

      {/* Harita */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        onRegionChangeComplete={setRegion}
      >
        {/* Bugünün İşleri (Mor/Mavi/Yeşil Marker'lar) */}
        {mapData?.today_schedules.map((schedule) => {
          if (!schedule.building?.coordinates) return null;

          const color = getScheduleMarkerColor(schedule.status);

          return (
            <Marker
              key={`schedule-${schedule.id}`}
              coordinate={{
                latitude: schedule.building.coordinates.lat,
                longitude: schedule.building.coordinates.lng,
              }}
              title={`📋 ${schedule.maintenance_type_label}`}
              description={`${schedule.building.name} - ${schedule.assigned_employee?.name || 'Atanmadı'}`}
            >
              <View style={[styles.scheduleMarker, { backgroundColor: color }]}>
                <Ionicons name="document-text" size={20} color="white" />
              </View>
            </Marker>
          );
        })}

        {/* Sahada Olan Çalışanlar (Yeşil Marker'lar) */}
        {mapData?.employees.map((employee) => {
          if (!employee.coordinates) return null;

          return (
            <Marker
              key={`employee-${employee.id}`}
              coordinate={{
                latitude: employee.coordinates.lat,
                longitude: employee.coordinates.lng,
              }}
              title={`👤 ${employee.name}`}
              description={`Son güncelleme: ${new Date(employee.last_update).toLocaleTimeString('tr-TR')}`}
            >
              <View style={styles.employeeMarker}>
                <Ionicons name="person" size={20} color="white" />
              </View>
            </Marker>
          );
        })}

        {/* Binalar (Gri Marker'lar - sadece bugün işi olmayanlar) */}
        {mapData?.buildings.map((building) => {
          // Bugün işi olan binaları göster
          const hasTodaySchedule = mapData?.today_schedules.some(
            s => s.building?.id === building.id
          );
          
          if (hasTodaySchedule || !building.coordinates) return null;

          return (
            <Marker
              key={`building-${building.id}`}
              coordinate={{
                latitude: building.coordinates.lat,
                longitude: building.coordinates.lng,
              }}
              title={`🏢 ${building.name}`}
              description={building.address}
            >
              <View style={styles.buildingMarker}>
                <Ionicons name="business" size={16} color="white" />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Alt Liste (Bugünün İşleri) */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadMapData().finally(() => setRefreshing(false));
          }} />
        }
      >
        {mapData?.today_schedules.map((schedule) => (
          <TouchableOpacity
            key={schedule.id}
            style={styles.scheduleCard}
            onPress={() => {
              // İş detayına git
              hapticFeedback.light();
            }}
          >
            <View style={styles.scheduleCardHeader}>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: getScheduleMarkerColor(schedule.status) }
              ]} />
              <Text style={styles.scheduleType}>{schedule.maintenance_type_label}</Text>
              <Text style={styles.scheduleStatus}>{schedule.status_label}</Text>
            </View>
            
            <Text style={styles.scheduleBuilding}>{schedule.building.name}</Text>
            <Text style={styles.scheduleAddress}>{schedule.building.address}</Text>
            
            <View style={styles.scheduleInfo}>
              <Ionicons name="person-outline" size={16} color={COLORS.gray[600]} />
              <Text style={styles.scheduleEmployee}>
                {schedule.assigned_employee?.name || 'Atanmadı'}
              </Text>
              
              {schedule.scheduled_time_display && (
                <>
                  <Ionicons name="time-outline" size={16} color={COLORS.gray[600]} style={styles.iconSpacer} />
                  <Text style={styles.scheduleTime}>{schedule.scheduled_time_display}</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {(!mapData?.today_schedules || mapData.today_schedules.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.gray[400]} />
            <Text style={styles.emptyText}>Bu tarihte planlanan iş yok</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  refreshButton: {
    padding: 8,
  },
  statsContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  statCard: {
    backgroundColor: COLORS.primary[50],
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary[600],
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray[600],
    marginTop: 4,
  },
  map: {
    width: width,
    height: height * 0.5, // Ekranın yarısı
  },
  scheduleMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  employeeMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.green[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buildingMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  listContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  scheduleCard: {
    backgroundColor: 'white',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scheduleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  scheduleType: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  scheduleStatus: {
    fontSize: 12,
    color: COLORS.gray[600],
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  scheduleBuilding: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  scheduleAddress: {
    fontSize: 12,
    color: COLORS.gray[600],
    marginBottom: 8,
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleEmployee: {
    fontSize: 12,
    color: COLORS.gray[700],
  },
  iconSpacer: {
    marginLeft: 12,
  },
  scheduleTime: {
    fontSize: 12,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray[500],
    marginTop: 16,
  },
});

export default LocationMapScreen;
```

---

## 📋 ADIM 7: Navigation Güncellemeleri

### 7.1. src/navigation/AppNavigator.tsx - Yeni Route'lar Ekle

```typescript
import LocationMapScreen from '../screens/location/LocationMapScreen';
import ActiveJobScreen from '../screens/maintenance/ActiveJobScreen';

// RootStackParamList'e ekle:
export type RootStackParamList = {
  // ... mevcut route'lar
  LocationMap: undefined;
  ActiveJob: {
    maintenanceScheduleId: number;
    maintenanceSchedule: MaintenanceSchedule;
  };
};

// Navigator'a ekle:
<Stack.Screen 
  name="LocationMap" 
  component={LocationMapScreen}
  options={{ 
    title: 'Konum Takibi',
    headerShown: true,
  }}
/>

<Stack.Screen 
  name="ActiveJob" 
  component={ActiveJobScreen}
  options={{ 
    title: 'Aktif İş',
    headerShown: true,
  }}
/>
```

---

## 📋 ADIM 8: Çalışma Mantığı

### 8.1. ÇALIŞAN TARAFI (Field Employee) - Akış

```
1. Çalışan uygulamayı açar
2. Dashboard'da bugünün işlerini görür
3. Bir işe tıklar → "ActiveJobScreen" açılır
4. "Konum Takibi" toggle'ını açık yapar
   → LocationService başlar
   → Her 30 saniyede bir konum alınır
   → API'ye gönderilir: POST /api/employee/location/update
   
5. Backend'de:
   - Konum kaydedilir (employee_locations tablosuna)
   - LocationCheckService çalışır
   - Eğer planlanan saat ±15 dakika içindeyse:
     - Geliş kontrolü yapılır
     - Distance hesaplanır
     - Status belirlenir (on_time, late, early)
   
6. İş bitince:
   - Tahmini bitiş saati ±15 dakika içindeyse:
     - Ayrılış kontrolü yapılır
     - Son durum kaydedilir
```

### 8.2. ADMIN TARAFI (Company Admin) - Akış

```
1. Admin uygulamayı açar
2. Sidebar'dan "Konum Takibi" seçer
3. "LocationMapScreen" açılır
4. Bugünün tarihine göre işler yüklenir:
   GET /api/location-map/data?date=2026-01-10
   
5. Haritada gösterilir:
   - Bugünün işleri (renkli marker'lar)
   - Sahada olan çalışanlar (yeşil marker'lar)
   - Binalar (gri marker'lar)
   
6. Otomatik yenileme:
   - Her 30 saniyede bir veri yenilenir
   - Çalışanların güncel konumları görülür
   
7. İş detayına tıklanırsa:
   - Konum kontrolü sonuçları gösterilir
   - Geliş/ayrılış durumları görülür
```

---

## 📋 ADIM 9: Backend API Endpoint'leri Kontrolü

Mevcut endpoint'lerin mobil uygulamadan erişilebilir olduğundan emin olun:

### 9.1. routes/api.php
```php
// Çalışan konum güncelleme (mobile'dan)
Route::post('/employee/location/update', [EmployeeController::class, 'updateLocation'])
    ->middleware(['auth:sanctum', 'role:employee']);

// Harita verileri (admin mobile'dan)
Route::get('/location-map/data', [LocationMapController::class, 'getMapData'])
    ->middleware(['auth:sanctum', 'role:company_admin']);

// Konum kontrolü sonuçları
Route::get('/location-map/location-checks/{maintenanceScheduleId}', 
    [LocationMapController::class, 'getLocationChecks'])
    ->middleware(['auth:sanctum']);
```

---

## 📋 ADIM 10: Test Senaryoları

### 10.1. Çalışan Tarafı Testleri

1. **Konum İzni Testi**
   - Uygulama ilk açıldığında izin istenir mi?
   - İzin verilmezse uygun mesaj gösterilir mi?

2. **Konum Takibi Testi**
   - Toggle açıldığında konum alınır mı?
   - Her 30 saniyede bir güncellenir mi?
   - Sunucuya gönderilir mi?

3. **Konum Kontrolü Testi**
   - Planlanan saat ±15 dakika içinde gelirse "on_time" olur mu?
   - Geç gelirse "late" olur mu?
   - Erken gelirse "early" olur mu?

### 10.2. Admin Tarafı Testleri

1. **Harita Yükleme**
   - Bugünün işleri gösterilir mi?
   - Sahada olan çalışanlar görünür mü?
   - Binalar doğru konumda mı?

2. **Otomatik Yenileme**
   - Her 30 saniyede bir veri yenilenir mi?
   - Çalışanların konumları güncellenir mi?

3. **Marker'lar**
   - İş durumuna göre renkler doğru mu?
   - Tıklanınca popup gösterilir mi?

---

## 🎯 Özet

### ✅ Çalışan Tarafı Özellikler
- ✅ Aktif iş ekranı
- ✅ Konum takibi toggle'ı
- ✅ Arka plan konum servisi
- ✅ Konum kontrolü sonuçları görüntüleme
- ✅ Geliş/ayrılış durumları

### ✅ Admin Tarafı Özellikler
- ✅ Harita görünümü
- ✅ Bugünün işleri listesi
- ✅ Sahada olan çalışanlar
- ✅ Binaların konumları
- ✅ Otomatik yenileme
- ✅ Konum kontrolü sonuçları

### 🔧 Teknik Gereksinimler
- ✅ expo-location (konum servisi)
- ✅ expo-task-manager (arka plan)
- ✅ react-native-maps (harita)
- ✅ Backend API entegrasyonu
- ✅ TypeScript type definitions

---

## 📝 Notlar

1. **Battery Optimization**: Arka plan konum takibi bataryayı etkileyebilir. Bu yüzden:
   - Sadece aktif iş varken çalıştırılmalı
   - İş bitince otomatik durdurulmalı
   - Balanced accuracy kullanılmalı (yüksek accuracy bataryayı tüketir)

2. **Privacy**: Kullanıcılara konum takibinin ne zaman aktif olduğu açıkça bildirilmeli.

3. **Offline Support**: İnternet yoksa konumlar lokal olarak saklanmalı ve bağlantı geldiğinde gönderilmeli (ileri seviye özellik).

4. **Error Handling**: Tüm hata durumları kullanıcı dostu mesajlarla gösterilmeli.
