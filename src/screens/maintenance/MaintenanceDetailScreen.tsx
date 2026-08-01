// 🔧 MAINTENANCE DETAIL SCREEN
// Bakım detay sayfası - Admin için tüm bilgiler

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { COLORS, DIMENSIONS, API_ENDPOINTS } from '../../constants';
import { apiClient } from '../../services/api/client';
import { hapticFeedback, formatCurrency, formatDate } from '../../utils';
import { navigationService } from '../../services/navigation/NavigationService';
import { useAuth } from '../../store/authStore';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: 'MaintenanceDetail';
  params: { maintenanceId: number };
};

interface MaintenanceDetail {
  id: number;
  building_id: number;
  assigned_employee_id?: number;
  maintenance_type: string;
  maintenance_type_label: string;
  scheduled_date: string;
  scheduled_time?: string;
  priority: string;
  priority_label: string;
  status: string;
  status_label: string;
  description?: string;
  notes?: string;
  estimated_cost?: number;
  estimated_duration?: number;
  created_at: string;
  updated_at: string;
  building?: {
    id: number;
    name: string;
    address: string;
    district: string;
    city: string;
    latitude?: number;
    longitude?: number;
    elevator_count: number;
    elevator_code?: string;
    elevator_brand?: string;
    elevator_model?: string;
  };
  assigned_employee?: {
    id: number;
    full_name: string;
    position: string;
    position_label: string;
    phone?: string;
    email?: string;
  };
  maintenance_report?: {
    id: number;
    start_time?: string;
    end_time?: string;
    work_description?: string;
    total_cost?: number;
    completion_status?: string;
    completion_percentage?: number;
    problems_found?: string;
    recommendations?: string;
    customer_name?: string;
    customer_notes?: string;
    approval_status?: 'onay_bekliyor' | 'onaylandi';
    approval_status_label?: string;
    approved_by_name?: string;
    approved_at?: string;
  };
}

const MaintenanceDetailScreen: React.FC = () => {
  // ==================== HOOKS — tümü koşulsuz, erken return'den önce ====================
  const navigationBase = useNavigation();
  const routeBase = useRoute();
  const navigation = navigationBase as unknown as NavigationProp;

  const params = routeBase?.params as { maintenanceId?: number } | undefined;
  const maintenanceId = params?.maintenanceId;

  const { isEmployee } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // ==================== STATE ====================
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceDetail | null>(null);

  // ==================== LOAD DATA ====================
  const loadMaintenanceDetail = useCallback(async () => {
    if (!maintenanceId) return;
    try {
      setError(null);
      const response = await apiClient.get(API_ENDPOINTS.MAINTENANCE_DETAIL(maintenanceId));

      // apiClient.get() returns response.data: { success: true, data: {...} }
      let maintenanceData = null;
      if (response?.success && response?.data) {
        maintenanceData = response.data;
      } else if (response?.id) {
        maintenanceData = response;
      } else if (response?.data && !response?.success) {
        maintenanceData = response.data;
      }

      if (maintenanceData && maintenanceData.id) {
        setMaintenance(maintenanceData);
      } else {
        setError('Bakım detayı bulunamadı');
        Alert.alert('Hata', 'Bakım detayı bulunamadı.', [
          { text: 'Tekrar Dene', onPress: loadMaintenanceDetail },
          { text: 'Tamam' },
        ]);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Bilinmeyen hata';
      setError(errorMessage);
      Alert.alert('Hata', errorMessage, [
        { text: 'Tekrar Dene', onPress: loadMaintenanceDetail },
        { text: 'Tamam' },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [maintenanceId]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    loadMaintenanceDetail();
  }, [loadMaintenanceDetail]);

  // ==================== VALIDATION — erken dönüş hook'lardan sonra ====================
  if (!maintenanceId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
        <AppHeader title="Bakım Detayı" showBack onBackPress={() => navigation.goBack()} onMenuPress={() => setSidebarVisible(true)} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error[500]} />
          <Text style={styles.errorText}>Bakım ID bulunamadı</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== HANDLERS ====================
  const handleEdit = () => {
    hapticFeedback.light();
    navigation.navigate('MaintenanceEdit', { maintenanceId });
  };

  const handleCallEmployee = () => {
    if (!maintenance?.assigned_employee?.phone) {
      Alert.alert('Hata', 'Personel telefon numarası bulunamadı');
      return;
    }
    hapticFeedback.light();
    Linking.openURL(`tel:${maintenance.assigned_employee.phone}`);
  };

  const handleNavigateToBuilding = () => {
    if (!maintenance?.building?.latitude || !maintenance?.building?.longitude) {
      Alert.alert('Hata', 'Bina konum bilgisi bulunamadı');
      return;
    }

    try {
      const lat = typeof maintenance.building.latitude === 'string'
        ? parseFloat(maintenance.building.latitude)
        : maintenance.building.latitude;
      const lng = typeof maintenance.building.longitude === 'string'
        ? parseFloat(maintenance.building.longitude)
        : maintenance.building.longitude;

      hapticFeedback.light();
      navigationService.showNavigationOptions(lat, lng, maintenance.building.address);
    } catch (error) {
      Alert.alert('Hata', 'Navigasyon açılamadı');
    }
  };

  const handleViewBuilding = () => {
    if (!maintenance?.building_id) return;
    hapticFeedback.light();
    navigation.navigate('BuildingDetail', { buildingId: maintenance.building_id });
  };

  // ==================== HELPERS ====================
  const getPriorityColor = (priority?: string | null) => {
    if (!priority) return COLORS.gray[400];
    
    switch (priority) {
      case 'acil':
        return COLORS.error[500];
      case 'yuksek':
        return COLORS.warning[600]; // orange yerine warning
      case 'normal':
        return COLORS.blue[500];
      case 'dusuk':
        return COLORS.gray[400];
      default:
        return COLORS.gray[400];
    }
  };

  const getStatusColor = (status?: string | null) => {
    if (!status) return COLORS.gray[500];
    
    switch (status) {
      case 'tamamlandi':
        return COLORS.success[500]; // green yerine success
      case 'baslandi':
        return COLORS.blue[500];
      case 'atandi':
        return COLORS.warning[500]; // orange yerine warning
      case 'planli':
        return COLORS.gray[500];
      case 'ertelendi':
        return COLORS.warning[500]; // yellow yerine warning
      case 'iptal':
        return COLORS.error[500];
      default:
        return COLORS.gray[500];
    }
  };

  // ==================== RENDER ====================
  
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
        <AppHeader title="Bakım Detayı" showBack onBackPress={() => navigation.goBack()} onMenuPress={() => setSidebarVisible(true)} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !maintenance) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
        <AppHeader title="Bakım Detayı" showBack onBackPress={() => navigation.goBack()} onMenuPress={() => setSidebarVisible(true)} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error[500]} />
          <Text style={styles.errorText}>{error || 'Bakım detayı bulunamadı'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadMaintenanceDetail}
          >
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Ekstra güvenlik kontrolü - maintenance null ise loading göster
  if (!maintenance && !loading && !error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
        <AppHeader title="Bakım Detayı" showBack onBackPress={() => navigation.goBack()} onMenuPress={() => setSidebarVisible(true)} />
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.errorText}>Veri yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const editButtonElement = !isEmployee ? (
    <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
      <Ionicons name="create-outline" size={24} color="white" />
    </TouchableOpacity>
  ) : undefined;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="Bakım Detayı"
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
        rightElement={editButtonElement}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadMaintenanceDetail} />
        }
      >
        {/* Status & Priority Badges */}
        {maintenance && (
          <View style={styles.badgesContainer}>
            <View
              style={[
                styles.badge,
                { backgroundColor: getStatusColor(maintenance?.status || 'planli') + '20' },
              ]}
            >
              <View
                style={[
                  styles.badgeDot,
                  { backgroundColor: getStatusColor(maintenance?.status || 'planli') },
                ]}
              />
              <Text
                style={[
                  styles.badgeText,
                  { color: getStatusColor(maintenance?.status || 'planli') },
                ]}
              >
                {maintenance?.status_label || 'Planlı'}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: getPriorityColor(maintenance?.priority || 'normal') + '20' },
              ]}
            >
              <View
                style={[
                  styles.badgeDot,
                  { backgroundColor: getPriorityColor(maintenance?.priority || 'normal') },
                ]}
              />
              <Text
                style={[
                  styles.badgeText,
                  { color: getPriorityColor(maintenance?.priority || 'normal') },
                ]}
              >
                {maintenance?.priority_label || 'Normal'}
              </Text>
            </View>
          </View>
        )}

        {/* Building Info Card */}
        {maintenance?.building && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="business-outline" size={20} color={COLORS.primary[500]} />
              <Text style={styles.cardTitle}>Bina Bilgileri</Text>
            </View>
            <TouchableOpacity
              onPress={handleViewBuilding}
              style={styles.buildingRow}
              activeOpacity={0.7}
            >
              <View style={styles.buildingInfo}>
                <Text style={styles.buildingName}>{maintenance.building?.name || 'İsimsiz Bina'}</Text>
                <Text style={styles.buildingAddress}>
                  {maintenance.building?.address || 'Adres bilgisi yok'}
                </Text>
                {maintenance.building?.elevator_code && (
                  <Text style={styles.elevatorCode}>
                    Kod: {maintenance.building.elevator_code}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>
            {maintenance.building?.latitude && maintenance.building?.longitude && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleNavigateToBuilding}
              >
                <Ionicons name="navigate-outline" size={18} color={COLORS.primary[500]} />
                <Text style={styles.actionButtonText}>Binaya Git</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Maintenance Info Card */}
        {maintenance && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="construct-outline" size={20} color={COLORS.primary[500]} />
              <Text style={styles.cardTitle}>Bakım Bilgileri</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bakım Tipi</Text>
              <Text style={styles.infoValue}>{maintenance?.maintenance_type_label || maintenance?.maintenance_type || 'Belirtilmemiş'}</Text>
            </View>
            {maintenance?.scheduled_date && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tarih</Text>
                <Text style={styles.infoValue}>
                  {formatDate(maintenance.scheduled_date)}
                  {maintenance.scheduled_time && ` • ${maintenance.scheduled_time}`}
                </Text>
              </View>
            )}
            {maintenance?.estimated_duration && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tahmini Süre</Text>
                <Text style={styles.infoValue}>{maintenance.estimated_duration} dakika</Text>
              </View>
            )}
            {maintenance?.estimated_cost && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tahmini Maliyet</Text>
                <Text style={styles.infoValue}>
                  {formatCurrency(maintenance.estimated_cost)}
                </Text>
              </View>
            )}
            {maintenance?.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>Açıklama</Text>
                <Text style={styles.descriptionText}>{maintenance.description}</Text>
              </View>
            )}
            {maintenance?.notes && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>Notlar</Text>
                <Text style={styles.descriptionText}>{maintenance.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Assigned Employee Card */}
        {maintenance?.assigned_employee && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-outline" size={20} color={COLORS.primary[500]} />
              <Text style={styles.cardTitle}>Atanan Personel</Text>
            </View>
            <View style={styles.employeeInfo}>
              <View style={styles.employeeDetails}>
                <Text style={styles.employeeName}>
                  {maintenance.assigned_employee?.full_name || 'İsimsiz'}
                </Text>
                <Text style={styles.employeePosition}>
                  {maintenance.assigned_employee?.position_label || maintenance.assigned_employee?.position || 'Belirtilmemiş'}
                </Text>
                {maintenance.assigned_employee?.phone && (
                  <Text style={styles.employeePhone}>
                    {maintenance.assigned_employee.phone}
                  </Text>
                )}
              </View>
              {maintenance.assigned_employee?.phone && (
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={handleCallEmployee}
                >
                  <Ionicons name="call-outline" size={20} color={COLORS.white} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Maintenance Report Card */}
        {maintenance?.maintenance_report && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.primary[500]} />
              <Text style={styles.cardTitle}>Bakım Raporu</Text>
            </View>
            {maintenance.maintenance_report?.start_time && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Başlangıç</Text>
                <Text style={styles.infoValue}>
                  {formatDate(maintenance.maintenance_report.start_time)}
                </Text>
              </View>
            )}
            {maintenance.maintenance_report?.end_time && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bitiş</Text>
                <Text style={styles.infoValue}>
                  {formatDate(maintenance.maintenance_report.end_time)}
                </Text>
              </View>
            )}
            {maintenance.maintenance_report?.work_description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>Yapılan İşler</Text>
                <Text style={styles.descriptionText}>
                  {maintenance.maintenance_report.work_description}
                </Text>
              </View>
            )}
            {maintenance.maintenance_report?.total_cost && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Toplam Maliyet</Text>
                <Text style={styles.infoValue}>
                  {formatCurrency(maintenance.maintenance_report.total_cost)}
                </Text>
              </View>
            )}
            {maintenance.maintenance_report?.completion_percentage !== undefined && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tamamlanma</Text>
                <Text style={styles.infoValue}>
                  %{maintenance.maintenance_report.completion_percentage}
                </Text>
              </View>
            )}
            {maintenance.maintenance_report?.problems_found && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>Tespit Edilen Sorunlar</Text>
                <Text style={styles.descriptionText}>
                  {maintenance.maintenance_report.problems_found}
                </Text>
              </View>
            )}
            {maintenance.maintenance_report?.recommendations && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>Öneriler</Text>
                <Text style={styles.descriptionText}>
                  {maintenance.maintenance_report.recommendations}
                </Text>
              </View>
            )}
            {maintenance.maintenance_report?.approval_status && (
              <View style={styles.approvalBox}>
                <Text style={styles.descriptionLabel}>Bina Yöneticisi Onayı</Text>
                <Text style={[
                  styles.approvalStatusText,
                  maintenance.maintenance_report.approval_status === 'onay_bekliyor' && styles.approvalPending,
                ]}>
                  {maintenance.maintenance_report.approval_status_label || maintenance.maintenance_report.approval_status}
                </Text>
                {maintenance.maintenance_report.approved_by_name && (
                  <Text style={styles.approvalMeta}>
                    {maintenance.maintenance_report.approved_by_name}
                    {maintenance.maintenance_report.approved_at ? ` — ${formatDate(maintenance.maintenance_report.approved_at)}` : ''}
                  </Text>
                )}
                {maintenance.maintenance_report.approval_status === 'onay_bekliyor' && (
                  <Text style={styles.approvalHint}>Bina yöneticisine SMS ile onay linki gönderildi.</Text>
                )}
              </View>
            )}
            {!isEmployee && maintenance.maintenance_report?.approval_status === 'onay_bekliyor' && (
              <TouchableOpacity
                style={styles.resendSmsBtn}
                onPress={async () => {
                  try {
                    const res = await apiClient.post(API_ENDPOINTS.MAINTENANCE_RESEND_APPROVAL_SMS(maintenance.id)) as { success?: boolean; message?: string };
                    await hapticFeedback.success();
                    Alert.alert(res?.success ? 'Başarılı' : 'Bilgi', res?.message ?? 'İşlem tamamlandı');
                    loadMaintenanceDetail();
                  } catch (e: any) {
                    Alert.alert('Hata', e?.response?.data?.message || e?.message || 'SMS gönderilemedi.');
                  }
                }}
              >
                <Ionicons name="mail-outline" size={18} color={COLORS.white} />
                <Text style={styles.resendSmsBtnText}>Onay SMS Tekrar Gönder</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.pdfDownloadBtn}
              onPress={async () => {
                try {
                  await apiClient.get(API_ENDPOINTS.MAINTENANCE_REPORT_DOWNLOAD(maintenance.id), { responseType: 'blob' });
                  await hapticFeedback.success();
                  Alert.alert('Başarılı', 'Bakım raporu PDF hazır. Web panelinden Bakım > ilgili kayıt > Rapor İndir ile indirebilirsiniz.');
                } catch (e: any) {
                  Alert.alert('Hata', e?.response?.data?.message || e?.message || 'PDF indirilemedi.');
                }
              }}
            >
              <Ionicons name="document-text" size={20} color={COLORS.white} />
              <Text style={styles.pdfDownloadBtnText}>Raporu PDF İndir</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  editButton: {
    padding: 4,
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DIMENSIONS.SCREEN_PADDING,
  },
  errorText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: DIMENSIONS.SCREEN_PADDING,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginLeft: 8,
  },
  buildingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  buildingInfo: {
    flex: 1,
  },
  buildingName: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  buildingAddress: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginBottom: 4,
  },
  elevatorCode: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[500],
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[50],
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  actionButtonText: {
    color: COLORS.primary[500],
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    marginLeft: 6,
  },
  approvalBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  approvalStatusText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '700',
    color: COLORS.success[700],
    marginTop: 4,
  },
  approvalPending: {
    color: COLORS.warning[700],
  },
  approvalMeta: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
    marginTop: 4,
  },
  approvalHint: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
    marginTop: 6,
  },
  resendSmsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.warning[600],
  },
  resendSmsBtnText: {
    color: COLORS.white,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
  },
  pdfDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary[500],
  },
  pdfDownloadBtnText: {
    color: COLORS.white,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  infoLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    flex: 1,
  },
  infoValue: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  descriptionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  descriptionLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
    lineHeight: 20,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  employeePosition: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginBottom: 4,
  },
  employeePhone: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[500],
  },
  callButton: {
    backgroundColor: COLORS.primary[500],
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});

export default MaintenanceDetailScreen;
