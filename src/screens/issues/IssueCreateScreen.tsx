// 🚨 YENİ ARİZA BİLDİRİMİ
// Bina seçimi, tip, öncelik, açıklama, iletişim

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Building } from '../../types';
import { Employee } from '../../types';
import { apiClient } from '../../services/api/client';
import { API_ENDPOINTS } from '../../constants';
import { COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback } from '../../utils';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import KeyboardAwareScrollView from '../../components/ui/KeyboardAwareScrollView';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ISSUE_TYPES = [
  { value: 'elektrik_arizasi', label: 'Elektrik Arızası' },
  { value: 'mekanik_ariza', label: 'Mekanik Arıza' },
  { value: 'kapı_arizasi', label: 'Kapı Arızası' },
  { value: 'ses_sistemi', label: 'Ses Sistemi' },
  { value: 'acil_durum', label: 'Acil Durum' },
  { value: 'diger', label: 'Diğer' },
] as const;

const PRIORITIES = [
  { value: 'dusuk', label: 'Düşük' },
  { value: 'orta', label: 'Orta' },
  { value: 'yuksek', label: 'Yüksek' },
  { value: 'acil', label: 'Acil' },
] as const;

const IssueCreateScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [buildingId, setBuildingId] = useState<number | ''>('');
  const [reportedBy, setReportedBy] = useState('');
  const [issueType, setIssueType] = useState<string>('diger');
  const [priority, setPriority] = useState<string>('orta');
  const [description, setDescription] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<number | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.BUILDINGS) as { success?: boolean; data?: Building[] };
        const list = Array.isArray((res as any)?.data) ? (res as any).data : (res as any)?.data?.data ?? [];
        if (!cancelled) setBuildings(list);
      } catch {
        if (!cancelled) setBuildings([]);
      } finally {
        if (!cancelled) setLoadingBuildings(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get(API_ENDPOINTS.EMPLOYEES) as { success?: boolean; data?: Employee[] };
        const list = Array.isArray((res as any)?.data) ? (res as any).data : (res as any)?.data?.data ?? [];
        if (!cancelled) {
          setEmployees(
            list.filter((employee: Employee) =>
              employee.is_active &&
              ['teknisyen', 'usta', 'muhendis'].includes(employee.position)
            )
          );
        }
      } catch {
        if (!cancelled) setEmployees([]);
      } finally {
        if (!cancelled) setLoadingEmployees(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async () => {
    if (!buildingId || !reportedBy.trim() || !description.trim()) {
      Alert.alert('Eksik alan', 'Bina, bildiren ve açıklama zorunludur.');
      return;
    }
    try {
      setSubmitting(true);
      await hapticFeedback.light();
      await apiClient.post(API_ENDPOINTS.ISSUE_REPORTS, {
        building_id: Number(buildingId),
        reported_by: reportedBy.trim(),
        issue_type: issueType,
        priority,
        description: description.trim(),
        location_details: locationDetails.trim() || undefined,
        contact_name: contactName.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        assigned_employee_id: assignedEmployeeId || undefined,
        is_urgent: isUrgent,
        requires_immediate_attention: isUrgent,
      });
      await hapticFeedback.success();
      Alert.alert('Başarılı', 'Arıza bildirimi oluşturuldu.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.response?.data?.errors ?? 'Kayıt oluşturulamadı';
      Alert.alert('Hata', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="Yeni Arıza"
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
      />

      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.label}>Bina *</Text>
        {loadingBuildings ? (
          <ActivityIndicator size="small" color={COLORS.primary[500]} style={styles.loader} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
            {buildings.map((b) => (
              <TouchableOpacity
                key={b.id}
                onPress={() => setBuildingId(b.id)}
                style={[styles.chip, buildingId === b.id && styles.chipSelected]}
              >
                <Text style={[styles.chipText, buildingId === b.id && styles.chipTextSelected]} numberOfLines={1}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <Text style={styles.label}>Bildiren *</Text>
        <TextInput
          value={reportedBy}
          onChangeText={setReportedBy}
          placeholder="Ad Soyad"
          style={styles.input}
          placeholderTextColor={COLORS.gray[400]}
        />

        <Text style={styles.label}>Arıza tipi</Text>
        <View style={styles.rowWrap}>
          {ISSUE_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              onPress={() => setIssueType(t.value)}
              style={[styles.chip, issueType === t.value && styles.chipSelected]}
            >
              <Text style={[styles.chipText, issueType === t.value && styles.chipTextSelected]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Öncelik</Text>
        <View style={styles.rowWrap}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p.value}
              onPress={() => setPriority(p.value)}
              style={[styles.chip, priority === p.value && styles.chipSelected]}
            >
              <Text style={[styles.chipText, priority === p.value && styles.chipTextSelected]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Açıklama *</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Arıza detayı"
          multiline
          numberOfLines={4}
          style={[styles.input, styles.textArea]}
          placeholderTextColor={COLORS.gray[400]}
        />

        <Text style={styles.label}>Konum detayı</Text>
        <TextInput
          value={locationDetails}
          onChangeText={setLocationDetails}
          placeholder="Örn. 3. kat, sol asansör"
          style={styles.input}
          placeholderTextColor={COLORS.gray[400]}
        />

        <Text style={styles.label}>İletişim adı</Text>
        <TextInput
          value={contactName}
          onChangeText={setContactName}
          placeholder="Ad Soyad"
          style={styles.input}
          placeholderTextColor={COLORS.gray[400]}
        />

        <Text style={styles.label}>İletişim telefon</Text>
        <TextInput
          value={contactPhone}
          onChangeText={setContactPhone}
          placeholder="05xx xxx xx xx"
          keyboardType="phone-pad"
          style={styles.input}
          placeholderTextColor={COLORS.gray[400]}
        />

        <Text style={styles.label}>Çalışana Ata</Text>
        {loadingEmployees ? (
          <ActivityIndicator size="small" color={COLORS.primary[500]} style={styles.loader} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
            <TouchableOpacity
              onPress={() => setAssignedEmployeeId(null)}
              style={[styles.chip, assignedEmployeeId === null && styles.chipSelected]}
            >
              <Text style={[styles.chipText, assignedEmployeeId === null && styles.chipTextSelected]}>
                Atama Yapma
              </Text>
            </TouchableOpacity>
            {employees.map((employee) => (
              <TouchableOpacity
                key={employee.id}
                onPress={() => setAssignedEmployeeId(employee.id)}
                style={[styles.chip, assignedEmployeeId === employee.id && styles.chipSelected]}
              >
                <Text
                  style={[styles.chipText, assignedEmployeeId === employee.id && styles.chipTextSelected]}
                  numberOfLines={1}
                >
                  {employee.full_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity
          onPress={() => setIsUrgent(!isUrgent)}
          style={styles.urgentRow}
        >
          <Ionicons name={isUrgent ? 'alert-circle' : 'alert-circle-outline'} size={24} color={isUrgent ? COLORS.error[500] : COLORS.gray[500]} />
          <Text style={styles.urgentLabel}>Acil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.submitBtnText}>Kaydet</Text>}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
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
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: DIMENSIONS.FONT_SIZE.LG, fontWeight: '700', color: COLORS.gray[900] },
  scrollContent: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 40 },
  label: { fontSize: DIMENSIONS.FONT_SIZE.SM, fontWeight: '600', color: COLORS.gray[700], marginBottom: 8, marginTop: 12 },
  loader: { marginVertical: 8 },
  pickerRow: { marginBottom: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.white, marginRight: 8 },
  chipSelected: { backgroundColor: COLORS.primary[500] },
  chipText: { fontSize: DIMENSIONS.FONT_SIZE.SM, color: COLORS.gray[700] },
  chipTextSelected: { color: COLORS.white },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    padding: 12,
    fontSize: DIMENSIONS.FONT_SIZE.MD,
    color: COLORS.gray[900],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  urgentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  urgentLabel: { fontSize: DIMENSIONS.FONT_SIZE.MD, color: COLORS.gray[700] },
  submitBtn: {
    marginTop: 24,
    padding: 16,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: COLORS.white, fontWeight: '700', fontSize: DIMENSIONS.FONT_SIZE.MD },
});

export default IssueCreateScreen;
