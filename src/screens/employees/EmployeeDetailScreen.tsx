// 👤 EMPLOYEE DETAIL SCREEN
// Personel detay sayfası - Sadece admin için

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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { COLORS, DIMENSIONS, API_ENDPOINTS } from '../../constants';
import { apiClient } from '../../services/api/client';
import { hapticFeedback, formatCurrency, formatDate } from '../../utils';
import { useAuth } from '../../store/authStore';
import DatePickerField from '../../components/ui/DatePickerField';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: 'EmployeeDetail';
  params: { employeeId: number };
};

interface EmployeeDetail {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  address?: string;
  position: string;
  position_label: string;
  salary: number;
  hire_date: string;
  is_active: boolean;
  notes?: string;
  performance?: {
    current_month: {
      tasks: number;
      completed: number;
      completion_rate: number;
    };
    current_year: {
      tasks: number;
      completed: number;
      completion_rate: number;
    };
    average_completion_time_minutes: number;
    monthly_performance: Array<{
      month: string;
      tasks: number;
      completed: number;
      rate: number;
    }>;
  };
  recent_maintenances: Array<{
    id: number;
    building_name: string;
    maintenance_type: string;
    maintenance_type_label: string;
    scheduled_date: string;
    status: string;
    status_label: string;
    priority: string;
    priority_label: string;
    is_completed: boolean;
  }>;
}

const EmployeeDetailScreen: React.FC = () => {
  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { employeeId } = route.params;
  const { isEmployee } = useAuth();

  // ==================== STATE ====================
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  // ==================== EFFECTS ====================
  useEffect(() => {
    // Sadece admin görebilir
    if (isEmployee) {
      Alert.alert('Yetki Hatası', 'Bu sayfaya erişim yetkiniz yok.', [
        {
          text: 'Tamam',
          onPress: () => navigation.goBack(),
        },
      ]);
      return;
    }
    fetchEmployeeDetail();
  }, [employeeId, isEmployee, navigation]);

  // ==================== FETCH DATA ====================
  const fetchEmployeeDetail = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.get(API_ENDPOINTS.EMPLOYEE_DETAIL(employeeId));
      
      // Backend'den { success: true, data: {...} } formatında geliyor
      const employeeData = response.data.data || response.data;
      setEmployee(employeeData);
    } catch (err: any) {
      console.error('❌ Employee detail fetch error:', err);
      setError(err.message || 'Personel detayları yüklenemedi');
      Alert.alert('Hata', 'Personel detayları yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId]);

  // ==================== HANDLERS ====================
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchEmployeeDetail();
  }, [fetchEmployeeDetail]);

  const openEdit = useCallback(() => {
    if (!employee) return;
    setForm({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone ?? '',
      address: employee.address ?? '',
      position: employee.position,
      salary: String(employee.salary ?? ''),
      hire_date: employee.hire_date ? employee.hire_date.split('T')[0] : '',
      notes: employee.notes ?? '',
    });
    setEditing(true);
  }, [employee]);

  const handleSaveProfile = useCallback(async () => {
    if (!employee) return;
    const { first_name, last_name, email, phone, address, position, salary, hire_date, notes } = form;
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !phone?.trim() || !position || !salary?.trim() || !hire_date?.trim()) {
      Alert.alert('Hata', 'Ad, soyad, e-posta, telefon, pozisyon, maaş ve işe başlama tarihi zorunludur.');
      return;
    }
    const numSalary = parseFloat(salary);
    if (isNaN(numSalary) || numSalary < 0) {
      Alert.alert('Hata', 'Geçerli bir maaş girin.');
      return;
    }
    try {
      setSaveLoading(true);
      await apiClient.put(API_ENDPOINTS.EMPLOYEE_UPDATE(employee.id), {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: (address ?? '').trim(),
        position,
        salary: numSalary,
        hire_date: hire_date.trim(),
        notes: (notes ?? '').trim(),
      });
      await hapticFeedback.success();
      Alert.alert('Başarılı', 'Çalışan bilgileri güncellendi.');
      setEditing(false);
      fetchEmployeeDetail();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.errors ? JSON.stringify(err.response.data.errors) : 'Güncelleme yapılamadı';
      Alert.alert('Hata', msg);
    } finally {
      setSaveLoading(false);
    }
  }, [employee, form, fetchEmployeeDetail]);

  const POSITION_OPTIONS: { value: string; label: string }[] = [
    { value: 'teknisyen', label: 'Teknisyen' },
    { value: 'usta', label: 'Usta' },
    { value: 'muhendis', label: 'Mühendis' },
    { value: 'yonetici', label: 'Yönetici' },
    { value: 'muhasebe', label: 'Muhasebe' },
  ];

  const handleCall = useCallback(async (phone: string) => {
    if (!phone) return;
    
    try {
      await hapticFeedback.light();
      const phoneNumber = phone.replace(/\s/g, '');
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

  // ==================== RENDER ====================
  if (isEmployee) {
    return null; // Çalışan göremez
  }

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

  if (error || !employee) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.error[500]} />
          <Text style={styles.errorTitle}>Hata</Text>
          <Text style={styles.errorText}>{error || 'Personel bulunamadı'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchEmployeeDetail}>
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
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Employee Info Card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {employee.first_name[0]}{employee.last_name[0]}
              </Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.employeeName}>{employee.full_name}</Text>
              <Text style={styles.employeePosition}>{employee.position_label}</Text>
            </View>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: employee.is_active ? COLORS.success[100] : COLORS.gray[100] }]}>
            <Text style={[styles.statusText, { color: employee.is_active ? COLORS.success[700] : COLORS.gray[700] }]}>
              {employee.is_active ? 'Aktif' : 'Pasif'}
            </Text>
          </View>

          {/* Call Button */}
          {employee.phone && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCall(employee.phone)}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={20} color="white" />
              <Text style={styles.callButtonText}>Ara</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Performance Metrics */}
        {employee.performance && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Performans</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{employee.performance.current_month.tasks || 0}</Text>
                <Text style={styles.metricLabel}>Bu Ay Toplam İş</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{employee.performance.current_month.completed || 0}</Text>
                <Text style={styles.metricLabel}>Bu Ay Tamamlanan</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: COLORS.primary[600] }]}>
                  %{employee.performance.current_month.completion_rate || 0}
                </Text>
                <Text style={styles.metricLabel}>Tamamlanma</Text>
              </View>
            </View>
          </View>
        )}

        {/* Employee Details */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
            <TouchableOpacity onPress={openEdit} style={styles.editButton}>
              <Ionicons name="pencil" size={20} color={COLORS.primary[600]} />
              <Text style={styles.editButtonText}>Düzenle</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={20} color={COLORS.gray[500]} />
            <Text style={styles.detailLabel}>E-posta:</Text>
            <Text style={styles.detailValue}>{employee.email}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={20} color={COLORS.gray[500]} />
            <Text style={styles.detailLabel}>Telefon:</Text>
            <TouchableOpacity onPress={() => handleCall(employee.phone)}>
              <Text style={[styles.detailValue, { color: COLORS.primary[600] }]}>
                {employee.phone}
              </Text>
            </TouchableOpacity>
          </View>

          {employee.address && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color={COLORS.gray[500]} />
              <Text style={styles.detailLabel}>Adres:</Text>
              <Text style={styles.detailValue}>{employee.address}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={COLORS.gray[500]} />
            <Text style={styles.detailLabel}>İşe Başlama:</Text>
            <Text style={styles.detailValue}>
              {formatDate(employee.hire_date)}
            </Text>
          </View>
        </View>

        {/* Salary Info - Sadece Admin için */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Maaş Bilgileri</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={20} color={COLORS.gray[500]} />
            <Text style={styles.detailLabel}>Maaş:</Text>
            <Text style={styles.detailValue}>{formatCurrency(employee.salary)}</Text>
          </View>
        </View>

        {/* Recent Work */}
        {employee.recent_maintenances && employee.recent_maintenances.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Son İşler</Text>
            {employee.recent_maintenances.slice(0, 5).map((maintenance) => (
              <View key={maintenance.id} style={styles.maintenanceItem}>
                <View style={styles.maintenanceHeader}>
                  <Text style={styles.maintenanceType}>{maintenance.maintenance_type_label}</Text>
                  <Text style={styles.maintenanceDate}>
                    {formatDate(maintenance.scheduled_date)}
                  </Text>
                </View>
                <Text style={styles.maintenanceBuilding}>{maintenance.building_name}</Text>
                <View style={styles.maintenanceFooter}>
                  <View style={[styles.statusBadgeSmall, { backgroundColor: COLORS.primary[100] }]}>
                    <Text style={[styles.statusTextSmall, { color: COLORS.primary[700] }]}>
                      {maintenance.status_label}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {employee.notes && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notlar</Text>
            <Text style={styles.notesText}>{employee.notes}</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editing} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profil Düzenle</Text>
              <TouchableOpacity onPress={() => setEditing(false)}>
                <Ionicons name="close" size={28} color={COLORS.gray[700]} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Ad</Text>
              <TextInput style={styles.input} value={form.first_name ?? ''} onChangeText={(t) => setForm((f) => ({ ...f, first_name: t }))} placeholder="Ad" />
              <Text style={styles.inputLabel}>Soyad</Text>
              <TextInput style={styles.input} value={form.last_name ?? ''} onChangeText={(t) => setForm((f) => ({ ...f, last_name: t }))} placeholder="Soyad" />
              <Text style={styles.inputLabel}>E-posta</Text>
              <TextInput style={styles.input} value={form.email ?? ''} onChangeText={(t) => setForm((f) => ({ ...f, email: t }))} placeholder="E-posta" keyboardType="email-address" autoCapitalize="none" />
              <Text style={styles.inputLabel}>Telefon</Text>
              <TextInput style={styles.input} value={form.phone ?? ''} onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))} placeholder="Telefon" keyboardType="phone-pad" />
              <Text style={styles.inputLabel}>Adres</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} value={form.address ?? ''} onChangeText={(t) => setForm((f) => ({ ...f, address: t }))} placeholder="Adres" multiline numberOfLines={2} />
              <Text style={styles.inputLabel}>Pozisyon</Text>
              <View style={styles.positionRow}>
                {POSITION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.positionChip, form.position === opt.value && styles.positionChipActive]}
                    onPress={() => setForm((f) => ({ ...f, position: opt.value }))}
                  >
                    <Text style={[styles.positionChipText, form.position === opt.value && styles.positionChipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Maaş</Text>
              <TextInput style={styles.input} value={form.salary ?? ''} onChangeText={(t) => setForm((f) => ({ ...f, salary: t }))} placeholder="0" keyboardType="decimal-pad" />
              <DatePickerField
                label="İşe Başlama"
                value={form.hire_date ?? ''}
                onChange={(v) => setForm((f) => ({ ...f, hire_date: v }))}
                placeholder="Tarih seçin"
              />
              <Text style={styles.inputLabel}>Notlar</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} value={form.notes ?? ''} onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))} placeholder="Notlar" multiline numberOfLines={3} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveProfile} disabled={saveLoading}>
                {saveLoading ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.modalSaveText}>Kaydet</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: 'white',
  },
  headerText: {
    flex: 1,
  },
  employeeName: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  employeePosition: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  statusText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success[500],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  callButtonText: {
    color: 'white',
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  editButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[600],
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DIMENSIONS.SCREEN_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  modalTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: '700',
    color: COLORS.gray[900],
  },
  modalScroll: {
    maxHeight: 400,
    padding: DIMENSIONS.SCREEN_PADDING,
  },
  inputLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[900],
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  positionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  positionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
  },
  positionChipActive: {
    backgroundColor: COLORS.primary[500],
  },
  positionChipText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  positionChipTextActive: {
    color: COLORS.white,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: DIMENSIONS.SCREEN_PADDING,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.gray[200],
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    minWidth: 100,
  },
  modalSaveText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.white,
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
  maintenanceBuilding: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginBottom: 8,
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
  notesText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[700],
    lineHeight: 22,
  },
});

export default EmployeeDetailScreen;
