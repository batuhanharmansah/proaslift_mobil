// 🏢 BUILDING DETAIL SCREEN
// Bina detay sayfası - Tüm bilgiler, bakım geçmişi, iletişimler, belgeler

import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
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

import { COLORS, DIMENSIONS, API_ENDPOINTS, API_CONFIG } from '../../constants';
import { apiClient } from '../../services/api/client';
import { hapticFeedback, formatCurrency, formatDate } from '../../utils';
import { navigationService } from '../../services/navigation/NavigationService';
import { useAuth } from '../../store/authStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: 'BuildingDetail';
  params: { buildingId: number };
};

interface BuildingDetail {
  id: number;
  name: string;
  address: string;
  district: string;
  city: string;
  latitude?: number;
  longitude?: number;
  floor_count: number;
  elevator_count: number;
  elevator_type: string;
  elevator_code?: string;
  elevator_brand: string;
  elevator_model: string;
  installation_year?: number;
  contract_type: string;
  monthly_fee: number;
  contract_start_date: string;
  contract_end_date: string;
  status: string;
  operational_status: string;
  responsible_person?: string;
  responsible_phone?: string;
  responsible_email?: string;
  notes?: string;
  contacts: Array<{
    id: number;
    name: string;
    title?: string;
    phone?: string;
    email?: string;
    apartment_no?: string;
    is_primary: boolean;
  }>;
  maintenance_schedules: Array<{
    id: number;
    maintenance_type: string;
    maintenance_type_label: string;
    scheduled_date: string;
    priority: string;
    status: string;
    status_label: string;
    assigned_employee?: {
      id: number;
      full_name: string;
    };
  }>;
  issue_reports: Array<{
    id: number;
    issue_type: string;
    issue_type_label?: string;
    priority: string;
    description: string;
    status: string;
    is_urgent: boolean;
    created_at: string;
  }>;
  metrics: {
    total_maintenance_this_year: number;
    completed_maintenance_this_year: number;
    completion_rate: number;
    days_until_contract_end: number;
    is_contract_expiring: boolean;
  };
}

const BuildingDetailScreen: React.FC = () => {
  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { buildingId } = route.params;
  const { isEmployee } = useAuth();

  // ==================== STATE ====================
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [building, setBuilding] = useState<BuildingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ==================== FETCH DATA ====================
  const fetchBuildingDetail = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.get(API_ENDPOINTS.BUILDING_DETAIL(buildingId));
      
      // Backend'den { success: true, data: {...} } formatında geliyor
      const buildingData = response.data.data || response.data;
      
      // Veri kontrolü
      if (!buildingData || !buildingData.id) {
        const errorMsg = `Bina detayı bulunamadı.\n\nAPI Response: ${JSON.stringify(response.data, null, 2)}`;
        setError('Bina detayı bulunamadı');
        Alert.alert(
          '❌ Bina Detayı Yüklenemedi',
          errorMsg,
          [{ text: 'Tamam' }]
        );
        return;
      }
      
      setBuilding(buildingData);
    } catch (err: any) {
      console.error('❌ Building detail fetch error:', err);
      
      // Detaylı hata mesajı oluştur - API client'ın koruduğu bilgileri kullan
      const statusCode = err.status || err.response?.status || 'Bilinmiyor';
      const statusText = err.statusText || err.response?.statusText || 'Bilinmiyor';
      const errorMessage = err.message || err.response?.data?.message || 'Bilinmeyen hata';
      const errorData = err.data || err.response?.data || {};
      const apiUrl = err.url || err.config?.url || `${API_CONFIG.BASE_URL}${API_ENDPOINTS.BUILDING_DETAIL(buildingId)}`;
      
      const detailedError = `Bina ID: ${buildingId}\n\n` +
        `HTTP Status: ${statusCode} ${statusText}\n\n` +
        `Hata Mesajı: ${errorMessage}\n\n` +
        `API URL: ${apiUrl}\n\n` +
        `Detaylı Hata:\n${JSON.stringify(errorData, null, 2)}`;
      
      setError(errorMessage);
      Alert.alert(
        '❌ Bina Detayı Yüklenemedi',
        detailedError,
        [
          { text: 'Tekrar Dene', onPress: fetchBuildingDetail },
          { text: 'Tamam' }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildingId]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchBuildingDetail();
  }, [fetchBuildingDetail]);

  const handleDeleteBuilding = useCallback(() => {
    Alert.alert(
      'Binayı Sil',
      `${building?.name || 'Bu bina'} silinecek. Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await hapticFeedback.medium();
              const response = await apiClient.delete(API_ENDPOINTS.BUILDING_DETAIL(buildingId)) as {
                success?: boolean;
                message?: string;
              };
              if (response?.success) {
                Alert.alert('Başarılı', response.message || 'Bina silindi.', [
                  { text: 'Tamam', onPress: () => navigation.navigate('Buildings') },
                ]);
              } else {
                Alert.alert('Hata', response?.message || 'Bina silinemedi.');
              }
            } catch (err: any) {
              Alert.alert('Hata', err?.response?.data?.message || err?.message || 'Bina silinemedi.');
            }
          },
        },
      ]
    );
  }, [building?.name, buildingId, navigation]);

  useLayoutEffect(() => {
    if (isEmployee) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('BuildingEdit', { buildingId })}
            style={{ padding: 8 }}
            accessibilityLabel="Düzenle"
          >
            <Ionicons name="create-outline" size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteBuilding} style={{ padding: 8 }} accessibilityLabel="Sil">
            <Ionicons name="trash-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, isEmployee, buildingId, handleDeleteBuilding]);

  // ==================== HANDLERS ====================
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchBuildingDetail();
  }, [fetchBuildingDetail]);

  const handleContactPress = useCallback(async (phone: string) => {
    if (!phone) return;
    
    try {
      await hapticFeedback.light();
      const phoneNumber = phone.replace(/\s/g, ''); // Boşlukları kaldır
      const url = `tel:${phoneNumber}`;
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        await hapticFeedback.success();
      } else {
        Alert.alert('Hata', 'Telefon araması yapılamıyor');
      }
    } catch (error) {
      console.error('❌ Phone call error:', error);
      Alert.alert('Hata', 'Arama başlatılamadı');
    }
  }, []);

  const handleNavigateToBuilding = useCallback(async () => {
    if (!building) return;
    
    try {
      await hapticFeedback.light();
      const fullAddress = `${building.address}, ${building.district}, ${building.city}`;
      
      await navigationService.showNavigationOptions({
        latitude: building.latitude || 0,
        longitude: building.longitude || 0,
        address: fullAddress,
        label: building.name,
      });
    } catch (error) {
      console.error('❌ Navigation error:', error);
      Alert.alert('Hata', 'Navigasyon başlatılamadı');
    }
  }, [building]);

  // ==================== RENDER ====================
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !building) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.error[500]} />
          <Text style={styles.errorTitle}>Hata</Text>
          <Text style={styles.errorText}>{error || 'Bina bulunamadı'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBuildingDetail}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Building Info Card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Ionicons name="business" size={32} color={COLORS.primary[500]} />
            <View style={styles.headerText}>
              <Text style={styles.buildingName}>{building.name}</Text>
              <Text style={styles.buildingAddress}>
                {building.address}, {building.district}, {building.city}
              </Text>
            </View>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: building.status === 'aktif' ? COLORS.success[100] : COLORS.gray[100] }]}>
            <Text style={[styles.statusText, { color: building.status === 'aktif' ? COLORS.success[700] : COLORS.gray[700] }]}>
              {building.status === 'aktif' ? 'Aktif' : 'Pasif'}
            </Text>
          </View>

          {/* Binaya Git Butonu */}
          {building.address && (
            <TouchableOpacity
              style={styles.navigateButton}
              onPress={handleNavigateToBuilding}
              activeOpacity={0.7}
            >
              <Ionicons name="navigate" size={20} color="white" />
              <Text style={styles.navigateButtonText}>Binaya Git</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Contacts */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>İletişimler</Text>
          {building.contacts && building.contacts.length > 0 ? (
            building.contacts.map((contact) => (
              <View key={contact.id} style={styles.contactItem}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>
                    {contact.name || 'İsimsiz'}
                    {contact.is_primary && (
                      <Text style={styles.primaryBadge}> (Birincil)</Text>
                    )}
                  </Text>
                  {contact.title && (
                    <Text style={styles.contactTitle}>{contact.title}</Text>
                  )}
                  {contact.phone ? (
                    <TouchableOpacity
                      onPress={() => handleContactPress(contact.phone ?? '')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.contactPhone}>{contact.phone}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.contactPhoneEmpty}>Telefon numarası yok</Text>
                  )}
                  {contact.email && (
                    <Text style={styles.contactEmail}>{contact.email}</Text>
                  )}
                </View>
                {contact.phone && (
                  <TouchableOpacity
                    style={styles.contactCallButton}
                    onPress={() => handleContactPress(contact.phone ?? '')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call" size={24} color={COLORS.success[500]} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyContactsContainer}>
              <Ionicons name="person-outline" size={48} color={COLORS.gray[300]} />
              <Text style={styles.emptyContactsText}>Bu bina için iletişim bilgisi bulunmuyor</Text>
            </View>
          )}
        </View>

        {/* Metrics Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>İstatistikler</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{building.metrics.total_maintenance_this_year}</Text>
              <Text style={styles.metricLabel}>Bu Yıl Bakım</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{building.metrics.completed_maintenance_this_year}</Text>
              <Text style={styles.metricLabel}>Tamamlanan</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: COLORS.primary[600] }]}>
                %{building.metrics.completion_rate}
              </Text>
              <Text style={styles.metricLabel}>Tamamlanma</Text>
            </View>
          </View>
        </View>

        {/* Building Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bina Bilgileri</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="layers-outline" size={20} color={COLORS.gray[500]} />
            <Text style={styles.detailLabel}>Kat Sayısı:</Text>
            <Text style={styles.detailValue}>{building.floor_count || 'Belirtilmemiş'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="cube-outline" size={20} color={COLORS.gray[500]} />
            <Text style={styles.detailLabel}>Asansör Sayısı:</Text>
            <Text style={styles.detailValue}>{building.elevator_count}</Text>
          </View>

          {building.elevator_brand && (
            <View style={styles.detailRow}>
              <Ionicons name="construct-outline" size={20} color={COLORS.gray[500]} />
              <Text style={styles.detailLabel}>Marka:</Text>
              <Text style={styles.detailValue}>{building.elevator_brand}</Text>
            </View>
          )}

          {building.elevator_model && (
            <View style={styles.detailRow}>
              <Ionicons name="settings-outline" size={20} color={COLORS.gray[500]} />
              <Text style={styles.detailLabel}>Model:</Text>
              <Text style={styles.detailValue}>{building.elevator_model}</Text>
            </View>
          )}

          {building.installation_year && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.gray[500]} />
              <Text style={styles.detailLabel}>Kurulum Yılı:</Text>
              <Text style={styles.detailValue}>{building.installation_year}</Text>
            </View>
          )}
        </View>

        {/* Contract Info - Sadece Admin için */}
        {!isEmployee && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sözleşme Bilgileri</Text>
            
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.gray[500]} />
              <Text style={styles.detailLabel}>Sözleşme Türü:</Text>
              <Text style={styles.detailValue}>
                {building.contract_type === 'bakim' ? 'Bakım' : building.contract_type}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={20} color={COLORS.gray[500]} />
              <Text style={styles.detailLabel}>Aylık Ücret:</Text>
              <Text style={styles.detailValue}>{formatCurrency(building.monthly_fee)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.gray[500]} />
              <Text style={styles.detailLabel}>Başlangıç:</Text>
              <Text style={styles.detailValue}>
                {formatDate(building.contract_start_date)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.gray[500]} />
              <Text style={styles.detailLabel}>Bitiş:</Text>
              <Text style={[styles.detailValue, building.metrics.is_contract_expiring && { color: COLORS.error[500] }]}>
                {formatDate(building.contract_end_date)}
                {building.metrics.is_contract_expiring && ' ⚠️'}
              </Text>
            </View>

            {building.metrics.days_until_contract_end !== null && (
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={20} color={COLORS.gray[500]} />
                <Text style={styles.detailLabel}>Kalan Süre:</Text>
                <Text style={[styles.detailValue, building.metrics.is_contract_expiring && { color: COLORS.error[500] }]}>
                  {building.metrics.days_until_contract_end > 0 
                    ? `${building.metrics.days_until_contract_end} gün`
                    : 'Süresi dolmuş'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recent Maintenance */}
        {building.maintenance_schedules && building.maintenance_schedules.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Son Bakımlar</Text>
            {building.maintenance_schedules.slice(0, 5).map((schedule) => (
              <View key={schedule.id} style={styles.maintenanceItem}>
                <View style={styles.maintenanceHeader}>
                  <Text style={styles.maintenanceType}>{schedule.maintenance_type_label}</Text>
                  <Text style={styles.maintenanceDate}>
                    {formatDate(schedule.scheduled_date)}
                  </Text>
                </View>
                <View style={styles.maintenanceFooter}>
                  <View style={[styles.statusBadgeSmall, { backgroundColor: COLORS.primary[100] }]}>
                    <Text style={[styles.statusTextSmall, { color: COLORS.primary[700] }]}>
                      {schedule.status_label}
                    </Text>
                  </View>
                  {schedule.assigned_employee && (
                    <Text style={styles.assignedEmployee}>
                      {schedule.assigned_employee.full_name}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Issue Reports */}
        {building.issue_reports && building.issue_reports.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Aktif Arızalar</Text>
            {building.issue_reports.map((issue) => (
              <View key={issue.id} style={styles.issueItem}>
                <View style={styles.issueHeader}>
                  <Text style={styles.issueType}>{issue.issue_type_label || issue.issue_type}</Text>
                  {issue.is_urgent && (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentText}>Acil</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.issueDescription}>{issue.description}</Text>
                <Text style={styles.issueDate}>
                  {formatDate(issue.created_at)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {building.notes && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notlar</Text>
            <Text style={styles.notesText}>{building.notes}</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DIMENSIONS.SCREEN_PADDING,
  },
  errorTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: COLORS.error[600],
    marginTop: 16,
  },
  errorText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[600],
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary[500],
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: DIMENSIONS.SCREEN_PADDING,
    marginTop: 16,
    padding: DIMENSIONS.SCREEN_PADDING,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  buildingName: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  buildingAddress: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  navigateButtonText: {
    color: 'white',
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: DIMENSIONS.FONT_SIZE.XXL,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  metricLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[600],
    marginLeft: 8,
    width: 120,
  },
  detailValue: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[900],
    fontWeight: '500',
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  primaryBadge: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.primary[600],
    fontWeight: '500',
  },
  contactTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginTop: 2,
  },
  contactPhone: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[600],
    marginTop: 4,
  },
  contactEmail: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginTop: 2,
  },
  contactCallButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.success[50],
  },
  contactPhoneEmpty: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[400],
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyContactsContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyContactsText: {
    marginTop: 12,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  maintenanceItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  maintenanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  maintenanceType: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  maintenanceDate: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  maintenanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusTextSmall: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
  },
  assignedEmployee: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  issueItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueType: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  urgentBadge: {
    backgroundColor: COLORS.error[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  urgentText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.error[600],
    fontWeight: '600',
  },
  issueDescription: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[700],
    marginBottom: 4,
  },
  issueDate: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
  },
  notesText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[700],
    lineHeight: 22,
  },
});

export default BuildingDetailScreen;
