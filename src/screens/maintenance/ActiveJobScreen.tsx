// 📋 ACTIVE JOB SCREEN - Aktif İş Ekranı (Çalışan Tarafı)
// Konum takibi: ekran odaklandığında (iş atandi/baslandi) otomatik başlar; ekran kapanınca veya rapor tamamlanınca durur.

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native';
import KeyboardAwareScrollView from '../../components/ui/KeyboardAwareScrollView';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { MaintenanceSchedule, LocationCheck, BuildingContact } from '../../types';
import { locationService } from '../../services/location/LocationService';
import { locationApi } from '../../services/api/locationApi';
import { apiClient } from '../../services/api/client';
import { navigationService } from '../../services/navigation/NavigationService';
import { useAuth } from '../../store/authStore';
import { COLORS, DIMENSIONS, STATUS_CONFIG, API_ENDPOINTS } from '../../constants';
import { hapticFeedback } from '../../utils';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import MaterialsList from '../../components/inventory/MaterialsList';

const ACTIVE_JOB_STATUSES = ['atandi', 'baslandi'];

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
  const { maintenanceScheduleId, maintenanceSchedule: initialSchedule } = route.params;
  
  // Güncellenebilir maintenance state (İşe Başla sonrası status değişir)
  const [maintenanceSchedule, setMaintenanceSchedule] = useState<MaintenanceSchedule>(initialSchedule);
  
  // ==================== HOOKS ====================
  const { isEmployee } = useAuth();
  
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [arrivalCheck, setArrivalCheck] = useState<LocationCheck | null>(null);
  const [departureCheck, setDepartureCheck] = useState<LocationCheck | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isStartingWork, setIsStartingWork] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const canStartWork = ['planli', 'atandi'].includes(maintenanceSchedule.status);

  // ==================== İşe Başla ====================
  const handleStartWork = useCallback(async () => {
    if (!canStartWork) return;
    try {
      setIsStartingWork(true);
      await hapticFeedback.light();
      const response = await apiClient.post(API_ENDPOINTS.MAINTENANCE_START(maintenanceScheduleId)) as any;
      if (response?.success && response?.data) {
        setMaintenanceSchedule(prev => ({
          ...prev,
          status: response.data.status,
          status_label: response.data.status_label || 'Başlandı',
        }));
        await hapticFeedback.success();
        Alert.alert('Başarılı', 'İş başarıyla başlatıldı. Şimdi bakım raporunu doldurabilirsiniz.');
      } else {
        throw new Error(response?.message || 'İş başlatılamadı');
      }
    } catch (error: any) {
      await hapticFeedback.error();
      Alert.alert('Hata', error?.message || 'İş başlatılamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsStartingWork(false);
    }
  }, [canStartWork, maintenanceScheduleId]);

  // ==================== Konum Kontrolü Yükleme ====================
  const loadLocationChecks = useCallback(async () => {
    try {
      const checks = await locationApi.getLocationChecks(maintenanceScheduleId);

      // Arrival ve departure check'leri ayır
      const arrival = checks.find(c => c.check_type === 'arrival');
      const departure = checks.find(c => c.check_type === 'departure');

      setArrivalCheck(arrival || null);
      setDepartureCheck(departure || null);
    } catch (error) {
      console.error('Load location checks error:', error);
    }
  }, [maintenanceScheduleId]);

  // ==================== Bakım Detayı (Rapor Dahil) Yükleme ====================
  const loadMaintenanceDetail = useCallback(async (): Promise<MaintenanceSchedule | null> => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.MAINTENANCE_DETAIL(maintenanceScheduleId)) as { success?: boolean; data?: MaintenanceSchedule };
      if (res?.success && res?.data) {
        setMaintenanceSchedule(res.data);
        return res.data;
      }
    } catch (e) {
      console.error('Load maintenance detail error:', e);
    }
    return null;
  }, [maintenanceScheduleId]);

  // ==================== Sayfa Odaklandığında: Otomatik konum başlat/durdur ====================
  useFocusEffect(
    useCallback(() => {
      let interval: ReturnType<typeof setInterval> | null = null;

      const run = async () => {
        loadLocationChecks();
        const schedule = await loadMaintenanceDetail();
        const status = schedule?.status ?? maintenanceSchedule.status;
        const isActive = ACTIVE_JOB_STATUSES.includes(status);

        if (isActive) {
          try {
            await locationService.startTracking({ jobId: maintenanceScheduleId });
            setIsLocationTracking(prev => (prev ? prev : true));
            const loc = await locationService.getCurrentLocation();
            if (loc) {
              setCurrentLocation(prev => {
                const next = {
                  lat: loc.coords.latitude,
                  lng: loc.coords.longitude,
                  accuracy: loc.coords.accuracy || 0,
                };
                if (prev && prev.lat === next.lat && prev.lng === next.lng && prev.accuracy === next.accuracy) {
                  return prev;
                }
                return next;
              });
              setLastUpdateTime(new Date());
            }
          } catch (err: any) {
            console.warn('Location tracking start failed:', err?.message);
            setIsLocationTracking(prev => (prev ? false : prev));
          }
        } else {
          locationService.stopTracking();
          setIsLocationTracking(prev => (prev ? false : prev));
          setCurrentLocation(prev => (prev ? null : prev));
          setLastUpdateTime(prev => (prev ? null : prev));
        }
      };

      run();

      // Not: bu interval SADECE ekranın hâlâ odakta olduğunu ve takip durumunu
      // periyodik doğrulamak için var — aynı değeri tekrar set ederek gereksiz
      // re-render / görsel titreşim üretmemesi için her setState çağrısı önce
      // mevcut değerle karşılaştırılıyor (prev === next ise state güncellenmiyor).
      interval = setInterval(() => {
        const state = locationService.getTrackingState();
        setIsLocationTracking(prev => (prev === state.active ? prev : state.active));
        if (state.active) {
          loadLocationChecks();
          locationService.getCurrentLocation().then(loc => {
            if (loc) {
              setCurrentLocation(prev => {
                const next = {
                  lat: loc.coords.latitude,
                  lng: loc.coords.longitude,
                  accuracy: loc.coords.accuracy || 0,
                };
                if (prev && prev.lat === next.lat && prev.lng === next.lng && prev.accuracy === next.accuracy) {
                  return prev;
                }
                return next;
              });
              setLastUpdateTime(new Date());
            }
          });
        }
      }, 10000);

      return () => {
        if (interval) clearInterval(interval);
        locationService.stopTracking();
        setIsLocationTracking(false);
        setCurrentLocation(null);
        setLastUpdateTime(null);
      };
    }, [maintenanceScheduleId, loadMaintenanceDetail, loadLocationChecks])
  );

  // ==================== Yenileme ====================
  const handleRefresh = async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    
    try {
      await loadMaintenanceDetail();
      await loadLocationChecks();
      
      if (isLocationTracking) {
        const location = await locationService.getCurrentLocation();
        if (location) {
          setCurrentLocation({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
          });
          setLastUpdateTime(new Date());
        }
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const hasReport = !!(maintenanceSchedule as any)?.maintenance_report;

  // ==================== Süreyi Formatla ====================
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours} saat ${mins} dakika`;
    } else if (hours > 0) {
      return `${hours} saat`;
    } else {
      return `${mins} dakika`;
    }
  };

  // ==================== Tarih Formatla ====================
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ==================== Görünüm ====================
  return (
    <>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="Aktif İş"
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
      />
      <KeyboardAwareScrollView
        style={styles.container}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* İş Bilgileri */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 İş Bilgileri</Text>

        {/* İşe Başla - Planlı/Atandı durumunda göster */}
        {canStartWork && (
          <TouchableOpacity
            style={styles.startWorkButton}
            onPress={handleStartWork}
            disabled={isStartingWork}
          >
            <Ionicons name="play-circle" size={28} color="white" />
            <Text style={styles.startWorkButtonText}>
              {isStartingWork ? 'Başlatılıyor...' : 'İşe Başla'}
            </Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>İş Tipi:</Text>
          <Text style={styles.value}>{maintenanceSchedule.maintenance_type_label}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Bina:</Text>
          <Text style={styles.value}>{maintenanceSchedule.building?.name || 'Bilinmiyor'}</Text>
        </View>
        
        {/* Adres ve Navigasyon */}
        <View style={styles.addressSection}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Adres:</Text>
            <Text style={styles.value}>{maintenanceSchedule.building?.address || 'Belirtilmemiş'}</Text>
          </View>
          
          {maintenanceSchedule.building?.address && (
            <View style={styles.addressActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={async () => {
                  await hapticFeedback.light();
                  const building = maintenanceSchedule.building;
                  if (building) {
                    await navigationService.showNavigationOptions({
                      latitude: building.latitude || 0,
                      longitude: building.longitude || 0,
                      address: building.address,
                      label: building.name,
                    });
                  }
                }}
              >
                <Ionicons name="navigate" size={20} color={COLORS.primary[600]} />
                <Text style={styles.actionButtonText}>İşe Git</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={async () => {
                  await hapticFeedback.light();
                  const address = maintenanceSchedule.building?.address;
                  if (address) {
                    await navigationService.copyAddress(address);
                  }
                }}
              >
                <Ionicons name="copy-outline" size={20} color={COLORS.gray[600]} />
                <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>Adresi Kopyala</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Planlanan Tarih:</Text>
          <Text style={styles.value}>
            {new Date(maintenanceSchedule.scheduled_date).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
        
        {maintenanceSchedule.scheduled_time && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Gidiş Saati:</Text>
            <Text style={styles.value}>
              {maintenanceSchedule.scheduled_time.split(' ')[1]?.substring(0, 5) || 
               maintenanceSchedule.scheduled_time.substring(0, 5)}
            </Text>
          </View>
        )}
        
        {maintenanceSchedule.estimated_duration && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Tahmini Süre:</Text>
            <Text style={styles.value}>{formatDuration(maintenanceSchedule.estimated_duration)}</Text>
          </View>
        )}
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Durum:</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: STATUS_CONFIG.maintenance[maintenanceSchedule.status]?.bgColor || COLORS.gray[50] }
          ]}>
            <Text style={[
              styles.statusText,
              { color: STATUS_CONFIG.maintenance[maintenanceSchedule.status]?.color || COLORS.gray[700] }
            ]}>
              {maintenanceSchedule.status_label}
            </Text>
          </View>
        </View>
      </View>

      {/* Müşteri İletişim Bilgileri */}
      {(maintenanceSchedule.building?.responsible_person || 
        maintenanceSchedule.building?.responsible_phone || 
        maintenanceSchedule.building?.responsible_email ||
        (maintenanceSchedule.building?.contacts && maintenanceSchedule.building.contacts.length > 0)) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Müşteri İletişim Bilgileri</Text>
          
          {/* Sorumlu Kişi */}
          {maintenanceSchedule.building?.responsible_person && (
            <View style={styles.contactRow}>
              <Ionicons name="person-outline" size={20} color={COLORS.primary[600]} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Sorumlu Kişi</Text>
                <Text style={styles.contactValue}>{maintenanceSchedule.building.responsible_person}</Text>
              </View>
            </View>
          )}
          
          {/* Telefon */}
          {maintenanceSchedule.building?.responsible_phone && (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={async () => {
                await hapticFeedback.light();
                const phone = maintenanceSchedule.building?.responsible_phone;
                if (phone) {
                  const phoneUrl = `tel:${phone.replace(/\s/g, '')}`;
                  await Linking.openURL(phoneUrl);
                }
              }}
            >
              <Ionicons name="call-outline" size={20} color={COLORS.success[500]} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Telefon</Text>
                <Text style={styles.contactValue}>{maintenanceSchedule.building.responsible_phone}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
          )}
          
          {/* E-posta */}
          {maintenanceSchedule.building?.responsible_email && (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={async () => {
                await hapticFeedback.light();
                const email = maintenanceSchedule.building?.responsible_email;
                if (email) {
                  const emailUrl = `mailto:${email}`;
                  await Linking.openURL(emailUrl);
                }
              }}
            >
              <Ionicons name="mail-outline" size={20} color={COLORS.primary[500]} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>E-posta</Text>
                <Text style={styles.contactValue}>{maintenanceSchedule.building.responsible_email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
          )}
          
          {/* Diğer İletişimler */}
          {maintenanceSchedule.building?.contacts && maintenanceSchedule.building.contacts.length > 0 && (
            <View style={styles.contactsList}>
              <Text style={styles.contactsTitle}>Diğer İletişimler:</Text>
              {maintenanceSchedule.building.contacts
                .filter(contact => contact.is_active)
                .map((contact: BuildingContact) => (
                  <View key={contact.id} style={styles.contactItem}>
                    <View style={styles.contactRow}>
                      <Ionicons name="person-circle-outline" size={20} color={COLORS.gray[600]} />
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactLabel}>{contact.name}</Text>
                        {contact.title && (
                          <Text style={styles.contactSubtitle}>{contact.title}</Text>
                        )}
                        {contact.apartment_no && (
                          <Text style={styles.contactSubtitle}>Daire: {contact.apartment_no}</Text>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.contactActions}>
                      {contact.phone && (
                        <TouchableOpacity
                          style={styles.contactAction}
                          onPress={async () => {
                            await hapticFeedback.light();
                            const phoneUrl = `tel:${contact.phone.replace(/\s/g, '')}`;
                            await Linking.openURL(phoneUrl);
                          }}
                        >
                          <Ionicons name="call" size={20} color={COLORS.success[500]} />
                        </TouchableOpacity>
                      )}
                      
                      {contact.email && (
                        <TouchableOpacity
                          style={styles.contactAction}
                          onPress={async () => {
                            await hapticFeedback.light();
                            const emailUrl = `mailto:${contact.email}`;
                            await Linking.openURL(emailUrl);
                          }}
                        >
                          <Ionicons name="mail" size={20} color={COLORS.primary[500]} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
            </View>
          )}
        </View>
      )}

      {/* Konum Takibi (otomatik: sadece aktif iş ekranındayken) */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabelContainer}>
            <Ionicons 
              name={isLocationTracking ? "location" : "location-outline"} 
              size={24} 
              color={isLocationTracking ? COLORS.primary[500] : COLORS.gray[500]} 
            />
            <Text style={styles.switchLabel}>
              {isLocationTracking ? 'Konum takibi aktif' : 'Konum takibi'}
            </Text>
          </View>
        </View>

        {isLocationTracking && (
          <View style={styles.trackingInfo}>
            <Text style={styles.trackingText}>
              ✅ Bu ekrandayken konumunuz otomatik gönderilir. Ekrandan çıkınca veya rapor tamamlanınca durur.
            </Text>
            
            {currentLocation && (
              <View style={styles.locationInfo}>
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={16} color={COLORS.primary[500]} />
                  <Text style={styles.locationText}>
                    Enlem: {currentLocation.lat.toFixed(6)}
                  </Text>
                </View>
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={16} color={COLORS.primary[500]} />
                  <Text style={styles.locationText}>
                    Boylam: {currentLocation.lng.toFixed(6)}
                  </Text>
                </View>
                {currentLocation.accuracy > 0 && (
                  <View style={styles.locationRow}>
                    <Ionicons name="speedometer" size={16} color={COLORS.gray[500]} />
                    <Text style={styles.locationText}>
                      Doğruluk: ±{Math.round(currentLocation.accuracy)}m
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            {lastUpdateTime && (
              <Text style={styles.lastUpdateText}>
                Son güncelleme: {lastUpdateTime.toLocaleTimeString('tr-TR')}
              </Text>
            )}
          </View>
        )}
        
        {!isLocationTracking && ACTIVE_JOB_STATUSES.includes(maintenanceSchedule.status) && (
          <Text style={styles.trackingHint}>
            💡 Konum izni verilirse bu ekrandayken otomatik başlar. Rapor tamamlanınca veya ekrandan çıkınca durur.
          </Text>
        )}
        {!isLocationTracking && !ACTIVE_JOB_STATUSES.includes(maintenanceSchedule.status) && (
          <Text style={styles.trackingHint}>
            Konum takibi sadece atanmış/başlanmış işlerde aktiftir.
          </Text>
        )}
      </View>

      {/* Kullanılan Malzemeler - Sadece Admin için */}
      {!isEmployee && (
        <View style={styles.section}>
          <MaterialsList
            maintenanceScheduleId={maintenanceScheduleId}
            showHeader={true}
            compact={false}
          />
        </View>
      )}

      {/* Rapor Oluştur / Raporu Görüntüle Butonu */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => {
            hapticFeedback.light();
            if (hasReport) {
              navigation.navigate('MaintenanceReportDetail', {
                maintenanceSchedule,
                maintenanceReport: (maintenanceSchedule as any).maintenance_report,
              });
            } else {
              navigation.navigate('CreateMaintenanceReport', {
                maintenanceScheduleId,
                maintenanceSchedule,
              });
            }
          }}
        >
          <Ionicons name={hasReport ? 'eye-outline' : 'document-text-outline'} size={24} color={COLORS.primary[600]} />
          <Text style={styles.reportButtonText}>
            {hasReport ? 'Bakım Raporunu Görüntüle' : 'Bakım Raporu Oluştur'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>
      </View>

      {/* Konum Kontrolü Sonuçları */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Konum Kontrolü</Text>

        {/* Geliş Kontrolü */}
        <View style={styles.checkCard}>
          <View style={styles.checkHeader}>
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color={arrivalCheck?.is_on_time ? COLORS.success[500] : arrivalCheck ? COLORS.error[500] : COLORS.gray[400]} 
            />
            <Text style={styles.checkTitle}>Geliş Kontrolü</Text>
          </View>
          
          {arrivalCheck ? (
            <View style={styles.checkDetails}>
              <View style={styles.checkRow}>
                <Text style={styles.checkLabel}>Planlanan:</Text>
                <Text style={styles.checkValue}>{formatDateTime(arrivalCheck.scheduled_time)}</Text>
              </View>
              
              {arrivalCheck.actual_time && (
                <View style={styles.checkRow}>
                  <Text style={styles.checkLabel}>Gerçek:</Text>
                  <Text style={styles.checkValue}>{formatDateTime(arrivalCheck.actual_time)}</Text>
                </View>
              )}
              
              <View style={styles.checkRow}>
                <Text style={styles.checkLabel}>Durum:</Text>
                <Text style={[
                  styles.checkValue,
                  { color: arrivalCheck.is_on_time ? COLORS.success[600] : COLORS.error[600] }
                ]}>
                  {arrivalCheck.is_on_time ? '✅ Zamanında' : '❌ Geç'}
                </Text>
              </View>
              
              {arrivalCheck.time_difference_minutes !== null && arrivalCheck.time_difference_minutes !== undefined && (
                <View style={styles.checkRow}>
                  <Text style={styles.checkLabel}>Fark:</Text>
                  <Text style={styles.checkValue}>
                    {Math.abs(arrivalCheck.time_difference_minutes)} dakika
                    {arrivalCheck.time_difference_minutes > 0 ? ' geç' : ' erken'}
                  </Text>
                </View>
              )}
              
              {arrivalCheck.distance_from_building !== null && arrivalCheck.distance_from_building !== undefined && (
                <View style={styles.checkRow}>
                  <Text style={styles.checkLabel}>Mesafe:</Text>
                  <Text style={styles.checkValue}>
                    {arrivalCheck.distance_from_building < 1000
                      ? `${Math.round(arrivalCheck.distance_from_building)}m`
                      : `${(arrivalCheck.distance_from_building / 1000).toFixed(2)}km`}
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
              color={departureCheck?.is_on_time ? COLORS.success[500] : departureCheck ? COLORS.error[500] : COLORS.gray[400]} 
            />
            <Text style={styles.checkTitle}>Ayrılış Kontrolü</Text>
          </View>
          
          {departureCheck ? (
            <View style={styles.checkDetails}>
              <View style={styles.checkRow}>
                <Text style={styles.checkLabel}>Planlanan:</Text>
                <Text style={styles.checkValue}>{formatDateTime(departureCheck.scheduled_time)}</Text>
              </View>
              
              {departureCheck.actual_time && (
                <View style={styles.checkRow}>
                  <Text style={styles.checkLabel}>Gerçek:</Text>
                  <Text style={styles.checkValue}>{formatDateTime(departureCheck.actual_time)}</Text>
                </View>
              )}
              
              <View style={styles.checkRow}>
                <Text style={styles.checkLabel}>Durum:</Text>
                <Text style={[
                  styles.checkValue,
                  { color: departureCheck.is_on_time ? COLORS.success[600] : COLORS.error[600] }
                ]}>
                  {departureCheck.is_on_time ? '✅ Zamanında' : '❌ Geç'}
                </Text>
              </View>
              
              {departureCheck.time_difference_minutes !== null && departureCheck.time_difference_minutes !== undefined && (
                <View style={styles.checkRow}>
                  <Text style={styles.checkLabel}>Fark:</Text>
                  <Text style={styles.checkValue}>
                    {Math.abs(departureCheck.time_difference_minutes)} dakika
                    {departureCheck.time_difference_minutes > 0 ? ' geç' : ' erken'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.checkPending}>İş bitene kadar bekleniyor</Text>
          )}
        </View>
      </View>
    </KeyboardAwareScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  section: {
    backgroundColor: 'white',
    margin: DIMENSIONS.SCREEN_PADDING,
    padding: DIMENSIONS.CARD_PADDING,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    ...DIMENSIONS.SHADOW_MD,
  },
  sectionTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 12,
  },
  startWorkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success[500],
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
    ...DIMENSIONS.SHADOW_MD,
  },
  startWorkButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: 'white',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  label: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
    flex: 2,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
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
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
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
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[700],
    fontWeight: '500',
    marginBottom: 8,
  },
  locationInfo: {
    marginTop: 8,
    gap: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[700],
  },
  lastUpdateText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
    marginTop: 8,
  },
  trackingHint: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[500],
    fontStyle: 'italic',
    marginTop: 12,
    lineHeight: 20,
  },
  addressSection: {
    marginTop: 8,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[50],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
    gap: 8,
  },
  actionButtonSecondary: {
    backgroundColor: COLORS.gray[50],
    borderColor: COLORS.gray[300],
  },
  actionButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.primary[600],
  },
  actionButtonTextSecondary: {
    color: COLORS.gray[700],
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    gap: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
    marginBottom: 2,
  },
  contactValue: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  contactSubtitle: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  contactsList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  contactsTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
  },
  contactAction: {
    padding: 8,
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
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.primary[50],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary[200],
    gap: 12,
  },
  reportButtonText: {
    flex: 1,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: 'bold',
    color: COLORS.primary[700],
  },
  checkDetails: {
    gap: 8,
  },
  checkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  checkLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  checkValue: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
    fontWeight: '500',
  },
  checkPending: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[500],
    fontStyle: 'italic',
  },
});

export default ActiveJobScreen;