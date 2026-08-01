// 📅 DAY END SCREEN
// Gün Sonu - Seçilen günün işlemleri ve özeti
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
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { useAuth } from '../../store/authStore';
import { apiClient } from '../../services/api/client';
import { API_ENDPOINTS } from '../../constants';
import { COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback, formatCurrency } from '../../utils';
import { formatDate } from '../../utils/dateUtils';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface DayEndTransaction {
  id: number;
  type: 'gelir' | 'gider' | string;
  type_label: string;
  description: string | null;
  amount: number;
  transaction_date: string | null;
  account_type: { id: number; name: string } | null;
  building: { id: number; name: string } | null;
}

export interface DayEndData {
  selected_date: string;
  day_income: number;
  day_expense: number;
  day_net: number;
  transactions: DayEndTransaction[];
}

const DayEndScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isEmployee } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [data, setData] = useState<DayEndData | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleExport = useCallback(async (format: 'pdf' | 'excel') => {
    try {
      setExporting(format);
      await hapticFeedback.light();
      const url = format === 'pdf'
        ? API_ENDPOINTS.FINANCIAL_DAY_END_EXPORT_PDF(selectedDate)
        : API_ENDPOINTS.FINANCIAL_DAY_END_EXPORT_EXCEL(selectedDate);
      await apiClient.get(url, { responseType: 'blob' });
      await hapticFeedback.success();
      Alert.alert(
        'Başarılı',
        `${format === 'pdf' ? 'PDF' : 'Excel'} raporu hazır. Dosyayı indirmek için web panelinden Finansal > Gün Sonu > ${format === 'pdf' ? 'PDF' : 'Excel'} İndir kullanabilirsiniz.`,
        [{ text: 'Tamam' }]
      );
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message || e?.message || 'Dışa aktarma yapılamadı.');
    } finally {
      setExporting(null);
    }
  }, [selectedDate]);

  const fetchDayEnd = useCallback(async () => {
    try {
      setLoading(true);
      const url = `${API_ENDPOINTS.FINANCIAL_DAY_END}?date=${selectedDate}`;
      const response = await apiClient.get(url);
      const raw = response?.data ?? response;
      if (raw?.success && raw?.data) {
        setData(raw.data);
      } else {
        setData(null);
        Alert.alert('Hata', 'Gün sonu verisi alınamadı.');
      }
    } catch (error: any) {
      console.error('Day-end fetch error:', error);
      setData(null);
      Alert.alert('Hata', 'Gün sonu yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (isEmployee) {
      Alert.alert('Yetkisiz Erişim', 'Bu sayfaya sadece admin kullanıcıları erişebilir.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
      return;
    }
    fetchDayEnd();
  }, [isEmployee, navigation, fetchDayEnd]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchDayEnd();
    setRefreshing(false);
  }, [fetchDayEnd]);

  const onDateChange = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  };


  const renderTransaction = ({ item }: { item: DayEndTransaction }) => (
    <View style={styles.transactionRow}>
      <View style={[styles.typeBadge, item.type === 'gelir' ? styles.typeGelir : styles.typeGider]}>
        <Text style={styles.typeBadgeText}>{item.type_label}</Text>
      </View>
      <View style={styles.transactionBody}>
        <Text style={styles.transactionDesc} numberOfLines={2}>
          {item.description || '—'}
        </Text>
        {item.account_type && (
          <Text style={styles.transactionMeta}>{item.account_type.name}</Text>
        )}
        {item.building?.name && (
          <Text style={styles.transactionMeta}>{item.building.name}</Text>
        )}
      </View>
      <Text style={[styles.transactionAmount, item.type === 'gelir' ? styles.amountPositive : styles.amountNegative]}>
        {item.type === 'gelir' ? '+' : '-'}{formatCurrency(Math.abs(item.amount))}
      </Text>
    </View>
  );

  if (isEmployee) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="Gün Sonu"
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
      />

      <TouchableOpacity
        style={styles.dateSelector}
        onPress={() => {
          hapticFeedback.light();
          setShowDatePicker(true);
        }}
      >
        <Ionicons name="calendar-outline" size={22} color={COLORS.primary[600]} />
        <Text style={styles.dateSelectorText}>{formatDate(selectedDate)}</Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.gray[600]} />
      </TouchableOpacity>

      <View style={styles.exportRow}>
        <TouchableOpacity
          style={[styles.exportBtn, exporting === 'pdf' && styles.exportBtnDisabled]}
          onPress={() => handleExport('pdf')}
          disabled={!!exporting}
        >
          {exporting === 'pdf' ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="document-text" size={20} color={COLORS.white} />
              <Text style={styles.exportBtnText}>PDF İndir</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportBtn, styles.exportBtnExcel, exporting === 'excel' && styles.exportBtnDisabled]}
          onPress={() => handleExport('excel')}
          disabled={!!exporting}
        >
          {exporting === 'excel' ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="grid" size={20} color={COLORS.white} />
              <Text style={styles.exportBtnText}>Excel İndir</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <Modal transparent animationType="slide">
          <TouchableOpacity
            style={styles.datePickerOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={styles.datePickerContent}>
              <DateTimePicker
                value={new Date(selectedDate + 'T12:00:00')}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
                locale="tr-TR"
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.datePickerDone} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDoneText}>Tamam</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {loading && !data ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : data ? (
        <>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, styles.summaryGreen]}>
              <Text style={styles.summaryLabel}>Gelir</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.day_income)}</Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryRed]}>
              <Text style={styles.summaryLabel}>Gider</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.day_expense)}</Text>
            </View>
            <View style={[styles.summaryCard, data.day_net >= 0 ? styles.summaryBlue : styles.summaryRed]}>
              <Text style={styles.summaryLabel}>Net</Text>
              <Text style={styles.summaryValue}>{formatCurrency(data.day_net)}</Text>
            </View>
          </View>

          <Text style={styles.listTitle}>İşlemler ({data.transactions.length})</Text>
          <FlatList
            data={data.transactions}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderTransaction}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary[500]} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color={COLORS.gray[400]} />
                <Text style={styles.emptyText}>Bu tarihte işlem yok</Text>
              </View>
            }
          />
        </>
      ) : null}
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
    paddingHorizontal: DIMENSIONS.padding,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray[900] },
  headerRight: { width: 32 },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: DIMENSIONS.padding,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  dateSelectorText: { fontSize: 16, fontWeight: '600', color: COLORS.gray[800] },
  exportRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: DIMENSIONS.SCREEN_PADDING ?? 16,
    marginTop: 12,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary[500],
  },
  exportBtnExcel: { backgroundColor: COLORS.success[600] },
  exportBtnDisabled: { opacity: 0.7 },
  exportBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  datePickerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  datePickerDone: { padding: 16, alignItems: 'center' },
  datePickerDoneText: { fontSize: 16, fontWeight: '600', color: COLORS.primary[600] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.gray[600] },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: DIMENSIONS.padding,
    marginTop: 16,
  },
  summaryCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryGreen: { backgroundColor: COLORS.success[50] },
  summaryRed: { backgroundColor: COLORS.error[50] },
  summaryBlue: { backgroundColor: COLORS.primary[50] },
  summaryLabel: { fontSize: 12, color: COLORS.gray[600], marginBottom: 4 },
  summaryValue: { fontSize: 13, fontWeight: '700' },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginHorizontal: DIMENSIONS.padding,
    marginTop: 20,
    marginBottom: 8,
  },
  listContent: { paddingHorizontal: DIMENSIONS.padding, paddingBottom: 24 },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  typeGelir: { backgroundColor: COLORS.success[100] },
  typeGider: { backgroundColor: COLORS.error[100] },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.gray[800] },
  transactionBody: { flex: 1 },
  transactionDesc: { fontSize: 14, color: COLORS.gray[800], fontWeight: '500' },
  transactionMeta: { fontSize: 12, color: COLORS.gray[500], marginTop: 2 },
  transactionAmount: { fontSize: 14, fontWeight: '700' },
  amountPositive: { color: COLORS.success[600] },
  amountNegative: { color: COLORS.error[600] },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.gray[500], marginTop: 8 },
});

export default DayEndScreen;
