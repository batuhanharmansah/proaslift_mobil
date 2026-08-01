// ✏️ MAINTENANCE EDIT SCREEN
// Bakım düzenleme sayfası - Admin için

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import KeyboardAwareScrollView from '../../components/ui/KeyboardAwareScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { COLORS, DIMENSIONS, API_ENDPOINTS, API_CONFIG } from '../../constants';
import { apiClient } from '../../services/api/client';
import { hapticFeedback, formatDate } from '../../utils';
import { useAuth } from '../../store/authStore';
import DatePickerField from '../../components/ui/DatePickerField';
import TimePickerField from '../../components/ui/TimePickerField';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProp = {
  key: string;
  name: 'MaintenanceEdit';
  params: { maintenanceId: number };
};

interface Building {
  id: number;
  name: string;
  address: string;
}

interface Employee {
  id: number;
  full_name: string;
  position: string;
  position_label: string;
}

interface MaintenanceFormData {
  building_id: string;
  assigned_employee_id: string;
  maintenance_type: string;
  scheduled_date: string;
  scheduled_time: string;
  priority: string;
  status: string;
  description: string;
  notes: string;
  estimated_cost: string;
  estimated_duration: string;
}

const MaintenanceEditScreen: React.FC = () => {
  // ==================== HOOKS ====================
  // Call hooks unconditionally - React Navigation guarantees context exists when screen is mounted
  const navigationBase = useNavigation();
  const routeBase = useRoute();
  
  // Type assertions - safe because we're inside NavigationContainer
  const navigation = navigationBase as unknown as NavigationProp;
  const route = routeBase as unknown as RouteProp;
  
  // Safely extract maintenanceId
  const maintenanceId = route.params?.maintenanceId;
  const { isEmployee } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // ==================== VALIDATION ====================
  if (!maintenanceId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
        <AppHeader title="Bakım Düzenle" showBack onBackPress={() => navigation.goBack()} onMenuPress={() => setSidebarVisible(true)} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.error[500]} />
          <Text style={styles.errorText}>Bakım ID bulunamadı</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== STATE ====================
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [formData, setFormData] = useState<MaintenanceFormData>({
    building_id: '',
    assigned_employee_id: '',
    maintenance_type: 'rutin_bakim',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '09:00',
    priority: 'normal',
    status: 'planli',
    description: '',
    notes: '',
    estimated_cost: '',
    estimated_duration: '',
  });
  const [showDropdown, setShowDropdown] = useState<{
    type: 'building' | 'employee' | 'maintenance_type' | 'priority' | 'status' | null;
  }>({ type: null });

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (isEmployee) {
      Alert.alert('Yetki Hatası', 'Bu sayfaya erişim yetkiniz yok.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    loadData();
  }, [maintenanceId, isEmployee, navigation]);

  // ==================== LOAD DATA ====================
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load maintenance detail, buildings, and employees in parallel
      const [maintenanceRes, buildingsRes, employeesRes] = await Promise.all([
        apiClient.get(API_ENDPOINTS.MAINTENANCE_DETAIL(maintenanceId)),
        apiClient.get(API_ENDPOINTS.BUILDINGS),
        apiClient.get(API_ENDPOINTS.EMPLOYEES),
      ]);

      // Set maintenance data
      // apiClient.get() zaten response.data döndürüyor, yani backend'den gelen { success: true, data: {...} } formatı
      // Ayrıca direkt data objesi de gelebilir
      const maintenance = maintenanceRes?.data || maintenanceRes;
      const hasValidData = maintenance && (maintenance.id || (maintenanceRes?.success && maintenanceRes?.data));
      
      if (hasValidData) {
        setFormData({
          building_id: maintenance?.building_id?.toString() || '',
          assigned_employee_id: maintenance?.assigned_employee_id?.toString() || '',
          maintenance_type: maintenance?.maintenance_type || 'rutin_bakim',
          scheduled_date: maintenance?.scheduled_date || new Date().toISOString().split('T')[0],
          scheduled_time: maintenance?.scheduled_time || '09:00',
          priority: maintenance?.priority || 'normal',
          status: maintenance?.status || 'planli',
          description: maintenance?.description || '',
          notes: maintenance?.notes || '',
          estimated_cost: maintenance?.estimated_cost?.toString() || '',
          estimated_duration: maintenance?.estimated_duration?.toString() || '',
        });
      } else {
        // Bakım detayı bulunamadı
        const errorMsg = `Bakım detayı bulunamadı.\n\n` +
          `Bakım ID: ${maintenanceId}\n\n` +
          `API Response: ${JSON.stringify(maintenanceRes, null, 2)}`;
        
        Alert.alert(
          '❌ Bakım Detayı Yüklenemedi',
          errorMsg,
          [
            { text: 'Tekrar Dene', onPress: loadData },
            { text: 'Geri Dön', onPress: () => navigation.goBack() }
          ]
        );
      }

      // Set buildings
      // apiClient.get() zaten response.data döndürüyor
      if (buildingsRes.success && buildingsRes.data) {
        setBuildings(buildingsRes.data);
      } else {
        console.warn('⚠️ Buildings data missing:', buildingsRes);
      }

      // Set employees
      // apiClient.get() zaten response.data döndürüyor
      if (employeesRes.success && employeesRes.data) {
        setEmployees(employeesRes.data);
      } else {
        console.warn('⚠️ Employees data missing:', employeesRes);
      }
    } catch (err: any) {
      console.error('❌ Load data error:', err);
      
      // Detaylı hata mesajı oluştur - API client'ın koruduğu bilgileri kullan
      const statusCode = err.status || err.response?.status || 'Bilinmiyor';
      const statusText = err.statusText || err.response?.statusText || 'Bilinmiyor';
      const errorMessage = err.message || err.response?.data?.message || 'Bilinmeyen hata';
      const errorData = err.data || err.response?.data || {};
      const apiUrl = err.url || err.config?.url || 'Bilinmiyor';
      
      const detailedError = `Bakım ID: ${maintenanceId}\n\n` +
        `HTTP Status: ${statusCode} ${statusText}\n\n` +
        `Hata Mesajı: ${errorMessage}\n\n` +
        `API URL: ${apiUrl}\n\n` +
        `Detaylı Hata:\n${JSON.stringify(errorData, null, 2)}`;
      
      Alert.alert(
        '❌ Veriler Yüklenemedi',
        detailedError,
        [
          { text: 'Tekrar Dene', onPress: loadData },
          { text: 'Geri Dön', onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setLoading(false);
    }
  }, [maintenanceId]);

  // ==================== HANDLERS ====================
  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      hapticFeedback.light();

      // Validation
      if (!formData.building_id) {
        Alert.alert('Hata', 'Lütfen bir bina seçin');
        setSaving(false);
        return;
      }

      const payload: any = {
        building_id: parseInt(formData.building_id),
        maintenance_type: formData.maintenance_type,
        scheduled_date: formData.scheduled_date,
        priority: formData.priority,
        status: formData.status,
      };

      if (formData.assigned_employee_id) {
        payload.assigned_employee_id = parseInt(formData.assigned_employee_id);
      }
      if (formData.scheduled_time) {
        payload.scheduled_time = formData.scheduled_time;
      }
      if (formData.description) {
        payload.description = formData.description;
      }
      if (formData.notes) {
        payload.notes = formData.notes;
      }
      if (formData.estimated_cost) {
        payload.estimated_cost = parseFloat(formData.estimated_cost);
      }
      if (formData.estimated_duration) {
        payload.estimated_duration = parseInt(formData.estimated_duration);
      }

      const response = await apiClient.put(
        API_ENDPOINTS.MAINTENANCE_DETAIL(maintenanceId),
        payload
      );

      if (response?.success) {
        hapticFeedback.success();
        Alert.alert('Başarılı', 'Bakım başarıyla güncellendi', [
          {
            text: 'Tamam',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        throw new Error(response?.message || 'Güncelleme başarısız');
      }
    } catch (err: any) {
      console.error('❌ Save error:', err);
      Alert.alert(
        'Hata',
        err.response?.data?.message || 'Bakım güncellenemedi'
      );
    } finally {
      setSaving(false);
    }
  }, [formData, maintenanceId, navigation]);

  // ==================== RENDER ====================
  if (isEmployee) {
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
        <AppHeader title="Bakım Düzenle" showBack onBackPress={() => navigation.goBack()} onMenuPress={() => setSidebarVisible(true)} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  const maintenanceTypes = [
    { value: 'rutin_bakim', label: 'Rutin Bakım' },
    { value: 'ariza_onarim', label: 'Arıza Onarım' },
    { value: 'periyodik_kontrol', label: 'Periyodik Kontrol' },
    { value: 'modernizasyon', label: 'Modernizasyon' },
  ];

  const priorities = [
    { value: 'dusuk', label: 'Düşük' },
    { value: 'normal', label: 'Normal' },
    { value: 'yuksek', label: 'Yüksek' },
    { value: 'acil', label: 'Acil' },
  ];

  const statuses = [
    { value: 'planli', label: 'Planlı' },
    { value: 'atandi', label: 'Atandı' },
    { value: 'baslandi', label: 'Başlandı' },
    { value: 'tamamlandi', label: 'Tamamlandı' },
    { value: 'ertelendi', label: 'Ertelendi' },
    { value: 'iptal', label: 'İptal' },
  ];

  const saveButton = (
    <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
      {saving ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.saveButtonText}>Kaydet</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="Bakım Düzenle"
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
        rightElement={saveButton}
      />

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* Building Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bina *</Text>
          <TouchableOpacity
            style={styles.selectContainer}
            onPress={() =>
              setShowDropdown({ type: showDropdown.type === 'building' ? null : 'building' })
            }
          >
            <Text style={styles.selectValue}>
              {buildings.find((b) => b.id.toString() === formData.building_id)?.name ||
                'Bina Seçin'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.gray[600]} />
          </TouchableOpacity>
          {showDropdown.type === 'building' && (
            <View style={styles.dropdown}>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {buildings.map((building) => (
                  <TouchableOpacity
                    key={building.id}
                    style={styles.optionItem}
                    onPress={() => {
                      setFormData({ ...formData, building_id: building.id.toString() });
                      setShowDropdown({ type: null });
                    }}
                  >
                    <Text style={styles.optionText}>{building.name}</Text>
                    {formData.building_id === building.id.toString() && (
                      <Ionicons name="checkmark" size={20} color={COLORS.primary[600]} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Employee Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Atanan Personel</Text>
          <TouchableOpacity
            style={styles.selectContainer}
            onPress={() =>
              setShowDropdown({
                type: showDropdown.type === 'employee' ? null : 'employee',
              })
            }
          >
            <Text style={styles.selectValue}>
              {employees.find((e) => e.id.toString() === formData.assigned_employee_id)
                ?.full_name || 'Personel Seçin (Opsiyonel)'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.gray[600]} />
          </TouchableOpacity>
          {showDropdown.type === 'employee' && (
            <View style={styles.dropdown}>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setFormData({ ...formData, assigned_employee_id: '' });
                    setShowDropdown({ type: null });
                  }}
                >
                  <Text style={styles.optionText}>Atanmamış</Text>
                  {!formData.assigned_employee_id && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary[600]} />
                  )}
                </TouchableOpacity>
                {employees.map((employee) => (
                  <TouchableOpacity
                    key={employee.id}
                    style={styles.optionItem}
                    onPress={() => {
                      setFormData({
                        ...formData,
                        assigned_employee_id: employee.id.toString(),
                      });
                      setShowDropdown({ type: null });
                    }}
                  >
                    <Text style={styles.optionText}>
                      {employee.full_name} ({employee.position_label})
                    </Text>
                    {formData.assigned_employee_id === employee.id.toString() && (
                      <Ionicons name="checkmark" size={20} color={COLORS.primary[600]} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Maintenance Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bakım Tipi *</Text>
          <TouchableOpacity
            style={styles.selectContainer}
            onPress={() =>
              setShowDropdown({
                type: showDropdown.type === 'maintenance_type' ? null : 'maintenance_type',
              })
            }
          >
            <Text style={styles.selectValue}>
              {maintenanceTypes.find((t) => t.value === formData.maintenance_type)?.label ||
                'Bakım Tipi Seçin'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.gray[600]} />
          </TouchableOpacity>
          {showDropdown.type === 'maintenance_type' && (
            <View style={styles.dropdown}>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {maintenanceTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={styles.optionItem}
                    onPress={() => {
                      setFormData({ ...formData, maintenance_type: type.value });
                      setShowDropdown({ type: null });
                    }}
                  >
                    <Text style={styles.optionText}>{type.label}</Text>
                    {formData.maintenance_type === type.value && (
                      <Ionicons name="checkmark" size={20} color={COLORS.primary[600]} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Date & Time */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <DatePickerField
              label="Tarih *"
              value={formData.scheduled_date}
              onChange={(v) => setFormData({ ...formData, scheduled_date: v })}
              placeholder="YYYY-MM-DD"
              style={{ marginBottom: 0 }}
            />
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <TimePickerField
              label="Saat"
              value={formData.scheduled_time}
              onChange={(v) => setFormData({ ...formData, scheduled_time: v })}
              placeholder="HH:MM"
              style={{ marginBottom: 0 }}
            />
          </View>
        </View>

        {/* Priority */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Öncelik *</Text>
          <TouchableOpacity
            style={styles.selectContainer}
            onPress={() =>
              setShowDropdown({
                type: showDropdown.type === 'priority' ? null : 'priority',
              })
            }
          >
            <Text style={styles.selectValue}>
              {priorities.find((p) => p.value === formData.priority)?.label || 'Öncelik Seçin'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.gray[600]} />
          </TouchableOpacity>
          {showDropdown.type === 'priority' && (
            <View style={styles.dropdown}>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {priorities.map((priority) => (
                  <TouchableOpacity
                    key={priority.value}
                    style={styles.optionItem}
                    onPress={() => {
                      setFormData({ ...formData, priority: priority.value });
                      setShowDropdown({ type: null });
                    }}
                  >
                    <Text style={styles.optionText}>{priority.label}</Text>
                    {formData.priority === priority.value && (
                      <Ionicons name="checkmark" size={20} color={COLORS.primary[600]} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Status */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Durum *</Text>
          <TouchableOpacity
            style={styles.selectContainer}
            onPress={() =>
              setShowDropdown({
                type: showDropdown.type === 'status' ? null : 'status',
              })
            }
          >
            <Text style={styles.selectValue}>
              {statuses.find((s) => s.value === formData.status)?.label || 'Durum Seçin'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.gray[600]} />
          </TouchableOpacity>
          {showDropdown.type === 'status' && (
            <View style={styles.dropdown}>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {statuses.map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={styles.optionItem}
                    onPress={() => {
                      setFormData({ ...formData, status: status.value });
                      setShowDropdown({ type: null });
                    }}
                  >
                    <Text style={styles.optionText}>{status.label}</Text>
                    {formData.status === status.value && (
                      <Ionicons name="checkmark" size={20} color={COLORS.primary[600]} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Estimated Cost & Duration */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Tahmini Maliyet (₺)</Text>
            <TextInput
              style={styles.input}
              value={formData.estimated_cost}
              onChangeText={(text) => setFormData({ ...formData, estimated_cost: text })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Tahmini Süre (dakika)</Text>
            <TextInput
              style={styles.input}
              value={formData.estimated_duration}
              onChangeText={(text) => setFormData({ ...formData, estimated_duration: text })}
              placeholder="0"
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Bakım açıklaması..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notlar</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Ek notlar..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </KeyboardAwareScrollView>
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
  saveButton: {
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
  },
  placeholder: {
    width: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: DIMENSIONS.SCREEN_PADDING,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[900],
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  selectContainer: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[900],
    flex: 1,
  },
  dropdown: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  optionText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[900],
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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
});

export default MaintenanceEditScreen;
