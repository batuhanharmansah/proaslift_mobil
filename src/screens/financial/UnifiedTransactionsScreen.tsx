// 💰 UNIFIED TRANSACTIONS SCREEN
// Alacaklar, Borçlar ve Düzenli Ödemeler tek listede + Yeni İşlem (Tek seferlik/Düzenli)
// SADECE ADMIN KULLANICILAR İÇİN

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { useAuth } from '../../store/authStore';
import { apiClient } from '../../services/api/client';
import { API_ENDPOINTS } from '../../constants';
import { COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback, formatCurrency } from '../../utils';
import { formatDate } from '../../utils/dateUtils';
import { Receivable, Payable, RecurringPayment, AccountType, Building } from '../../types';
import DatePickerField from '../../components/ui/DatePickerField';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterType = 'tumu' | 'alacak' | 'borc' | 'duzenli';

type UnifiedItem =
  | { kind: 'alacak'; id: number; title: string; amount: number; dateLabel: string; raw: Receivable }
  | { kind: 'borc'; id: number; title: string; amount: number; dateLabel: string; raw: Payable }
  | { kind: 'duzenli'; id: number; title: string; amount: number; dateLabel: string; raw: RecurringPayment };

const FREQUENCY_OPTIONS: { value: 'haftalik' | 'aylik' | 'uc_aylik' | 'yillik'; label: string }[] = [
  { value: 'haftalik', label: 'Haftalık' },
  { value: 'aylik', label: 'Aylık' },
  { value: 'uc_aylik', label: '3 Aylık' },
  { value: 'yillik', label: 'Yıllık' },
];

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'elektrik', label: 'Elektrik' },
  { value: 'su', label: 'Su' },
  { value: 'kira', label: 'Kira' },
  { value: 'diger', label: 'Diğer' },
];

const UnifiedTransactionsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isEmployee } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('tumu');
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [recurring, setRecurring] = useState<RecurringPayment[]>([]);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const [txType, setTxType] = useState<'alacak' | 'borc'>('alacak');
  const [plan, setPlan] = useState<'tek' | 'duzenli'>('tek');
  const [form, setForm] = useState({
    title: '',
    description: '',
    amount: '',
    building_id: '',
    category: 'diger',
    due_date: new Date().toISOString().split('T')[0],
    start_date: new Date().toISOString().split('T')[0],
    frequency: 'aylik' as 'haftalik' | 'aylik' | 'uc_aylik' | 'yillik',
    day_of_month: '1',
    account_id: '',
    notes: '',
  });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [recRes, payRes, recurRes, accRes, bldRes] = await Promise.all([
        apiClient.get(`${API_ENDPOINTS.FINANCIAL_RECEIVABLES}?per_page=50`),
        apiClient.get(`${API_ENDPOINTS.FINANCIAL_PAYABLES}?per_page=50`),
        apiClient.get(`${API_ENDPOINTS.FINANCIAL_RECURRING_PAYMENTS}?per_page=50`),
        apiClient.get(API_ENDPOINTS.FINANCIAL_ACCOUNTS),
        apiClient.get(API_ENDPOINTS.BUILDINGS),
      ]);

      const toList = (r: any) => {
        const d = r?.data;
        if (Array.isArray(d)) return d;
        if (d && Array.isArray(d.data)) return d.data;
        return Array.isArray(r) ? r : [];
      };
      setReceivables(toList(recRes));
      setPayables(toList(payRes));
      setRecurring(toList(recurRes));
      if (accRes?.data && Array.isArray(accRes.data)) setAccounts(accRes.data);
      else if (accRes?.success && accRes?.data && Array.isArray(accRes.data)) setAccounts(accRes.data);
      if (bldRes?.data && Array.isArray(bldRes.data)) setBuildings(bldRes.data);
      else if (bldRes?.success && bldRes?.data && Array.isArray(bldRes.data)) setBuildings(bldRes.data);
    } catch (e: any) {
      console.error('UnifiedTransactions fetch error:', e);
      Alert.alert('Hata', 'Liste yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isEmployee) {
      Alert.alert('Yetkisiz Erişim', 'Bu sayfaya sadece admin kullanıcıları erişebilir.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    fetchAll();
  }, [isEmployee, navigation, fetchAll]);

  const unifiedList: UnifiedItem[] = [
    ...receivables.map((r) => ({
      kind: 'alacak' as const,
      id: r.id,
      title: r.title,
      amount: r.remaining_amount ?? r.total_amount,
      dateLabel: r.due_date ? formatDate(r.due_date) : '—',
      raw: r,
    })),
    ...payables.map((p) => ({
      kind: 'borc' as const,
      id: p.id,
      title: p.title,
      amount: p.remaining_amount ?? p.total_amount,
      dateLabel: p.due_date ? formatDate(p.due_date) : '—',
      raw: p,
    })),
    ...recurring.map((r) => ({
      kind: 'duzenli' as const,
      id: r.id,
      title: r.title,
      amount: r.amount,
      dateLabel: r.next_payment_date ? formatDate(r.next_payment_date) : (r.start_date ? formatDate(r.start_date) : '—'),
      raw: r,
    })),
  ].sort((a, b) => (a.dateLabel > b.dateLabel ? 1 : -1));

  const filteredList =
    filter === 'tumu'
      ? unifiedList
      : filter === 'alacak'
        ? unifiedList.filter((i) => i.kind === 'alacak')
        : filter === 'borc'
          ? unifiedList.filter((i) => i.kind === 'borc')
          : unifiedList.filter((i) => i.kind === 'duzenli');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const resetForm = () => {
    setTxType('alacak');
    setPlan('tek');
    setForm({
      title: '',
      description: '',
      amount: '',
      building_id: '',
      category: 'diger',
      due_date: new Date().toISOString().split('T')[0],
      start_date: new Date().toISOString().split('T')[0],
      frequency: 'aylik',
      day_of_month: '1',
      account_id: '',
      notes: '',
    });
  };

  const submitNew = async () => {
    const amount = parseFloat(form.amount);
    if (!form.title.trim() || isNaN(amount) || amount <= 0) {
      Alert.alert('Eksik Bilgi', 'Başlık ve tutar zorunludur.');
      return;
    }
    if (plan === 'tek') {
      if (txType === 'alacak' && !form.building_id) {
        Alert.alert('Eksik Bilgi', 'Alacak için bina seçin.');
        return;
      }
    } else {
      if (txType === 'alacak' && !form.building_id) {
        Alert.alert('Eksik Bilgi', 'Düzenli gelir için bina seçin.');
        return;
      }
    }

    try {
      setLoading(true);
      await hapticFeedback.medium();

      if (plan === 'tek') {
        if (txType === 'alacak') {
          const res = await apiClient.post(API_ENDPOINTS.FINANCIAL_RECEIVABLES, {
            title: form.title.trim(),
            description: form.description || null,
            total_amount: amount,
            building_id: parseInt(form.building_id),
            due_date: form.due_date,
            payment_type: 'tek_sefer',
            installment_count: 1,
            priority: 'orta',
            notes: form.notes || null,
          });
          if (res?.success ?? res?.data?.success) {
            Alert.alert('Başarılı', 'Alacak oluşturuldu');
            setShowAddModal(false);
            resetForm();
            fetchAll();
          }
        } else {
          const res = await apiClient.post(API_ENDPOINTS.FINANCIAL_PAYABLES, {
            title: form.title.trim(),
            description: form.description || null,
            total_amount: amount,
            category: form.category,
            due_date: form.due_date,
            priority: 'orta',
            notes: form.notes || null,
          });
          if (res?.success ?? res?.data?.success) {
            Alert.alert('Başarılı', 'Borç oluşturuldu');
            setShowAddModal(false);
            resetForm();
            fetchAll();
          }
        }
      } else {
        const dayOfMonth = form.day_of_month ? parseInt(form.day_of_month, 10) : null;
        const res = await apiClient.post(API_ENDPOINTS.FINANCIAL_RECURRING_PAYMENTS, {
          title: form.title.trim(),
          description: form.description || null,
          amount,
          type: txType === 'alacak' ? 'gelir' : 'gider',
          frequency: form.frequency,
          start_date: form.start_date,
          end_date: null,
          building_id: form.building_id ? parseInt(form.building_id) : null,
          account_id: form.account_id ? parseInt(form.account_id) : null,
          category: txType === 'borc' ? form.category : null,
          day_of_month: dayOfMonth && dayOfMonth >= 1 && dayOfMonth <= 31 ? dayOfMonth : null,
          is_active: true,
          notes: form.notes || null,
        });
        if (res?.success ?? res?.data?.success) {
          Alert.alert('Başarılı', 'Düzenli ödeme oluşturuldu');
          setShowAddModal(false);
          resetForm();
          fetchAll();
        }
      }
    } catch (err: any) {
      Alert.alert('Hata', err?.response?.data?.message || 'İşlem kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };


  const renderItem = ({ item }: { item: UnifiedItem }) => {
    const isAlacak = item.kind === 'alacak';
    const isDüzenli = item.kind === 'duzenli';
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          if (item.kind === 'alacak') navigation.navigate('Receivables');
          else if (item.kind === 'borc') navigation.navigate('Payables');
          else navigation.navigate('RecurringPayments');
        }}
      >
        <View style={[styles.badge, isDüzenli ? styles.badgeDüzenli : isAlacak ? styles.badgeAlacak : styles.badgeBorc]}>
          <Text style={styles.badgeText}>
            {isDüzenli ? 'Düzenli' : isAlacak ? 'Alacak' : 'Borç'}
          </Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.rowDate}>{item.dateLabel}</Text>
        </View>
        <Text style={[styles.rowAmount, isAlacak || (isDüzenli && (item.raw as RecurringPayment).type === 'gelir') ? styles.amountPlus : styles.amountMinus]}>
          {formatCurrency(item.amount)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isEmployee) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="İşlemler"
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
      />

      <View style={styles.filterRow}>
        {(['tumu', 'alacak', 'borc', 'duzenli'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => { hapticFeedback.light(); setFilter(f); }}
          >
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f === 'tumu' ? 'Tümü' : f === 'alacak' ? 'Alacak' : f === 'borc' ? 'Borç' : 'Düzenli'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && unifiedList.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Kayıt yok</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => { hapticFeedback.light(); resetForm(); setShowAddModal(true); }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni İşlem</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={COLORS.gray[700]} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>İşlem tipi</Text>
              <View style={styles.segRow}>
                <TouchableOpacity style={[styles.seg, txType === 'alacak' && styles.segActive]} onPress={() => setTxType('alacak')}>
                  <Text style={[styles.segText, txType === 'alacak' && styles.segTextActive]}>Alacak</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.seg, txType === 'borc' && styles.segActive]} onPress={() => setTxType('borc')}>
                  <Text style={[styles.segText, txType === 'borc' && styles.segTextActive]}>Borç</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Ödeme planı</Text>
              <View style={styles.segRow}>
                <TouchableOpacity style={[styles.seg, plan === 'tek' && styles.segActive]} onPress={() => setPlan('tek')}>
                  <Text style={[styles.segText, plan === 'tek' && styles.segTextActive]}>Tek seferlik</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.seg, plan === 'duzenli' && styles.segActive]} onPress={() => setPlan('duzenli')}>
                  <Text style={[styles.segText, plan === 'duzenli' && styles.segTextActive]}>Düzenli</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Başlık *</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
                placeholder="Örn. Bina aidatı"
              />
              <Text style={styles.fieldLabel}>Tutar *</Text>
              <TextInput
                style={styles.input}
                value={form.amount}
                onChangeText={(t) => setForm((f) => ({ ...f, amount: t }))}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              {plan === 'tek' && (
                <DatePickerField
                  label="Vade tarihi"
                  value={form.due_date}
                  onChange={(v) => setForm((f) => ({ ...f, due_date: v }))}
                  placeholder="Tarih seçin"
                />
              )}

              {txType === 'alacak' && (
                <>
                  <Text style={styles.fieldLabel}>Bina *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.buildingChips}>
                    {buildings.map((b) => (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.chip, form.building_id === String(b.id) && styles.chipActive]}
                        onPress={() => setForm((f) => ({ ...f, building_id: String(b.id) }))}
                      >
                        <Text style={[styles.chipText, form.building_id === String(b.id) && styles.chipTextActive]} numberOfLines={1}>{b.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {txType === 'borc' && (
                <>
                  <Text style={styles.fieldLabel}>Kategori</Text>
                  <View style={styles.chipRow}>
                    {CATEGORY_OPTIONS.map((c) => (
                      <TouchableOpacity
                        key={c.value}
                        style={[styles.chip, form.category === c.value && styles.chipActive]}
                        onPress={() => setForm((f) => ({ ...f, category: c.value }))}
                      >
                        <Text style={[styles.chipText, form.category === c.value && styles.chipTextActive]}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {plan === 'duzenli' && (
                <>
                  <Text style={styles.fieldLabel}>Sıklık</Text>
                  <View style={styles.chipRow}>
                    {FREQUENCY_OPTIONS.map((fq) => (
                      <TouchableOpacity
                        key={fq.value}
                        style={[styles.chip, form.frequency === fq.value && styles.chipActive]}
                        onPress={() => setForm((f) => ({ ...f, frequency: fq.value }))}
                      >
                        <Text style={[styles.chipText, form.frequency === fq.value && styles.chipTextActive]}>{fq.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.fieldLabel}>Ödeme günü (1-31)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.day_of_month}
                    onChangeText={(t) => setForm((f) => ({ ...f, day_of_month: t }))}
                    placeholder="1"
                    keyboardType="number-pad"
                  />
                  <DatePickerField
                    label="Başlangıç tarihi"
                    value={form.start_date}
                    onChange={(v) => setForm((f) => ({ ...f, start_date: v }))}
                    placeholder="Tarih seçin"
                  />
                </>
              )}

              <Text style={styles.fieldLabel}>Açıklama</Text>
              <TextInput
                style={[styles.input, styles.inputArea]}
                value={form.description}
                onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
                placeholder="Opsiyonel"
                multiline
              />
              <TouchableOpacity style={styles.submitBtn} onPress={submitNew}>
                <Text style={styles.submitBtnText}>Kaydet</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: DIMENSIONS.padding, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.gray[200] },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray[900] },
  headerRight: { width: 32 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: DIMENSIONS.padding, paddingVertical: 12, backgroundColor: '#fff' },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.gray[100] },
  filterBtnActive: { backgroundColor: COLORS.primary[500] },
  filterBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.gray[600] },
  filterBtnTextActive: { color: '#fff' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: DIMENSIONS.padding, paddingBottom: 88 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, marginBottom: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.gray[200] },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
  badgeAlacak: { backgroundColor: COLORS.success[100] },
  badgeBorc: { backgroundColor: COLORS.error[100] },
  badgeDüzenli: { backgroundColor: COLORS.primary[100] },
  badgeText: { fontSize: 11, fontWeight: '600', color: COLORS.gray[800] },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: COLORS.gray[800] },
  rowDate: { fontSize: 12, color: COLORS.gray[500], marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: '700' },
  amountPlus: { color: COLORS.success[600] },
  amountMinus: { color: COLORS.error[600] },
  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: COLORS.gray[500] },
  fab: { position: 'absolute', right: DIMENSIONS.padding, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary[500], justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.gray[200] },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray[900] },
  modalScroll: { padding: 16, paddingBottom: 32 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.gray[700], marginBottom: 6, marginTop: 12 },
  segRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  seg: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.gray[100], alignItems: 'center' },
  segActive: { backgroundColor: COLORS.primary[500] },
  segText: { fontSize: 14, fontWeight: '600', color: COLORS.gray[600] },
  segTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: COLORS.gray[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  inputArea: { minHeight: 60, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  buildingChips: { marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.gray[100] },
  chipActive: { backgroundColor: COLORS.primary[500] },
  chipText: { fontSize: 13, color: COLORS.gray[700] },
  chipTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: COLORS.primary[500], paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default UnifiedTransactionsScreen;
