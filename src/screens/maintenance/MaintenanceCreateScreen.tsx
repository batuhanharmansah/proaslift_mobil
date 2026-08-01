// ➕ YENİ BAKIM PLANLA
// Sadece admin – bina, tip, tarih, personel, açıklama

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { COLORS, DIMENSIONS, API_ENDPOINTS } from '../../constants';
import { apiClient } from '../../services/api/client';
import { hapticFeedback } from '../../utils';
import { useAuth } from '../../store/authStore';
import DatePickerField from '../../components/ui/DatePickerField';
import TimePickerField from '../../components/ui/TimePickerField';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Building {
  id: number;
  name: string;
  address?: string;
}

interface Employee {
  id: number;
  full_name: string;
  position_label?: string;
}

const MAINTENANCE_TYPES = [
  { value: 'rutin_bakim', label: 'Rutin Bakım' },
  { value: 'ariza_onarim', label: 'Arıza Onarım' },
  { value: 'periyodik_kontrol', label: 'Periyodik Kontrol' },
  { value: 'modernizasyon', label: 'Modernizasyon' },
];

const PRIORITIES = [
  { value: 'dusuk', label: 'Düşük' },
  { value: 'normal', label: 'Normal' },
  { value: 'yuksek', label: 'Yüksek' },
  { value: 'acil', label: 'Acil' },
];

const MaintenanceCreateScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isEmployee } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [buildingId, setBuildingId] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [maintenanceType, setMaintenanceType] = useState('rutin_bakim');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [priority, setPriority] = useState('normal');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [showBuildingPicker, setShowBuildingPicker] = useState(false);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  useEffect(() => {
    if (isEmployee) {
      Alert.alert('Yetki', 'Bu sayfaya sadece admin erişebilir.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const [buildRes, empRes] = await Promise.all([
          apiClient.get(API_ENDPOINTS.BUILDINGS) as any,
          apiClient.get(API_ENDPOINTS.EMPLOYEES) as any,
        ]);
        const bList = Array.isArray(buildRes?.data) ? buildRes.data : buildRes?.data?.data ?? [];
        const eList = Array.isArray(empRes?.data) ? empRes.data : empRes?.data?.data ?? [];
        setBuildings(bList);
        setEmployees(eList);
      } catch (e) {
        Alert.alert('Hata', 'Bina veya personel listesi yüklenemedi.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isEmployee, navigation]);

  const handleSubmit = useCallback(async () => {
    if (!buildingId?.trim()) {
      Alert.alert('Hata', 'Lütfen bir bina seçin.');
      return;
    }
    if (!description?.trim()) {
      Alert.alert('Hata', 'Açıklama zorunludur.');
      return;
    }
    try {
      setSaving(true);
      await hapticFeedback.light();
      const payload: any = {
        building_id: parseInt(buildingId, 10),
        maintenance_type: maintenanceType,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime || null,
        priority,
        description: description.trim(),
        notes: notes.trim() || null,
      };
      if (employeeId) payload.assigned_employee_id = parseInt(employeeId, 10);

      const res = await apiClient.post(API_ENDPOINTS.MAINTENANCE_SCHEDULES, payload) as any;
      if (res?.success !== false) {
        await hapticFeedback.success();
        Alert.alert('Başarılı', 'Bakım planlandı.', [
          { text: 'Tamam', onPress: () => navigation.navigate('Maintenance') },
        ]);
      } else {
        throw new Error(res?.message || 'Planlama başarısız');
      }
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || e?.message || 'Bakım planlanamadı.');
    } finally {
      setSaving(false);
    }
  }, [buildingId, employeeId, maintenanceType, scheduledDate, scheduledTime, priority, description, notes, navigation]);

  if (isEmployee) return null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
        <AppHeader
          title="Yeni Bakım Planla"
          showBack
          onBackPress={() => navigation.goBack()}
          onMenuPress={() => setSidebarVisible(true)}
        />
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  const selectedBuilding = buildings.find((b) => String(b.id) === buildingId);
  const selectedEmployee = employees.find((e) => String(e.id) === employeeId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="Yeni Bakım Planla"
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Bina *</Text>
        <TouchableOpacity
          style={styles.picker}
          onPress={() => setShowBuildingPicker(!showBuildingPicker)}
        >
          <Text style={selectedBuilding ? styles.pickerText : styles.pickerPlaceholder}>
            {selectedBuilding ? selectedBuilding.name : 'Bina seçin'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.gray[500]} />
        </TouchableOpacity>
        {showBuildingPicker && (
          <View style={styles.pickerList}>
            {buildings.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={styles.pickerItem}
                onPress={() => {
                  setBuildingId(String(b.id));
                  setShowBuildingPicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Bakım tipi</Text>
        <View style={styles.chipRow}>
          {MAINTENANCE_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.chip, maintenanceType === t.value && styles.chipActive]}
              onPress={() => setMaintenanceType(t.value)}
            >
              <Text style={[styles.chipText, maintenanceType === t.value && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <DatePickerField
          label="Tarih *"
          value={scheduledDate}
          onChange={setScheduledDate}
          placeholder="Tarih seçin"
        />

        <TimePickerField
          label="Saat"
          value={scheduledTime}
          onChange={setScheduledTime}
          placeholder="09:00"
        />

        <Text style={styles.label}>Öncelik</Text>
        <View style={styles.chipRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[styles.chip, priority === p.value && styles.chipActive]}
              onPress={() => setPriority(p.value)}
            >
              <Text style={[styles.chipText, priority === p.value && styles.chipTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Atanan personel (isteğe bağlı)</Text>
        <TouchableOpacity
          style={styles.picker}
          onPress={() => setShowEmployeePicker(!showEmployeePicker)}
        >
          <Text style={selectedEmployee ? styles.pickerText : styles.pickerPlaceholder}>
            {selectedEmployee ? selectedEmployee.full_name : 'Personel seçin'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.gray[500]} />
        </TouchableOpacity>
        {showEmployeePicker && (
          <View style={styles.pickerList}>
            <TouchableOpacity
              style={styles.pickerItem}
              onPress={() => {
                setEmployeeId('');
                setShowEmployeePicker(false);
              }}
            >
              <Text style={styles.pickerItemText}>Atanmasın</Text>
            </TouchableOpacity>
            {employees.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={styles.pickerItem}
                onPress={() => {
                  setEmployeeId(String(e.id));
                  setShowEmployeePicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{e.full_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Açıklama *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Bakım açıklaması"
          placeholderTextColor={COLORS.gray[400]}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Notlar</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="İsteğe bağlı notlar"
          placeholderTextColor={COLORS.gray[400]}
          multiline
          numberOfLines={2}
        />

        <TouchableOpacity
          style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText}>Planla</Text>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: DIMENSIONS.FONT_SIZE.LG, fontWeight: '700', color: COLORS.gray[900] },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 24 },
  label: { fontSize: DIMENSIONS.FONT_SIZE.SM, color: COLORS.gray[600], marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[900],
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerText: { fontSize: DIMENSIONS.FONT_SIZE.BASE, color: COLORS.gray[900] },
  pickerPlaceholder: { fontSize: DIMENSIONS.FONT_SIZE.BASE, color: COLORS.gray[400] },
  pickerList: { marginTop: 4, backgroundColor: COLORS.white, borderRadius: 8, borderWidth: 1, borderColor: COLORS.gray[200], maxHeight: 200 },
  pickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  pickerItemText: { fontSize: DIMENSIONS.FONT_SIZE.BASE, color: COLORS.gray[900] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.gray[100] },
  chipActive: { backgroundColor: COLORS.primary[500] },
  chipText: { fontSize: DIMENSIONS.FONT_SIZE.SM, color: COLORS.gray[700] },
  chipTextActive: { color: COLORS.white, fontWeight: '600' },
  submitBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: COLORS.white, fontWeight: '700', fontSize: DIMENSIONS.FONT_SIZE.BASE },
});

export default MaintenanceCreateScreen;
