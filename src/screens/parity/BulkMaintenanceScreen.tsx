import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import AppHeader from '../../components/navigation/AppHeader';
import { apiClient } from '../../services/api/client';
import { API_ENDPOINTS, COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback } from '../../utils';

const now = new Date();

const BulkMaintenanceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [startDay, setStartDay] = useState('1');
  const [spreadDays, setSpreadDays] = useState('5');
  const [distribution, setDistribution] = useState<'single_day' | 'spread'>('spread');
  const [shiftHolidays, setShiftHolidays] = useState(true);
  const [onlyWithFee, setOnlyWithFee] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const payload = useCallback(() => ({
    year: parseInt(year, 10),
    month: parseInt(month, 10),
    start_day: parseInt(startDay, 10) || 1,
    shift_holidays: shiftHolidays,
    distribution,
    spread_days: parseInt(spreadDays, 10) || 1,
    assignment_strategy: 'building_default',
    only_with_fee: onlyWithFee,
  }), [year, month, startDay, shiftHolidays, distribution, spreadDays, onlyWithFee]);

  const handlePreview = useCallback(async () => {
    await hapticFeedback.light();
    setLoading(true);
    try {
      const response = await apiClient.post(API_ENDPOINTS.BULK_MAINTENANCE_PREVIEW, payload()) as {
        success?: boolean;
        data?: any;
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (response?.success) {
        setPreview(response.data);
      } else {
        Alert.alert('Hata', response?.message || 'Önizleme alınamadı.');
      }
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      Alert.alert('Hata', errors ? Object.values(errors).flat().join('\n') : (err?.response?.data?.message || err?.message || 'Önizleme alınamadı.'));
    } finally {
      setLoading(false);
    }
  }, [payload]);

  const handleStore = useCallback(async () => {
    Alert.alert('Toplu bakım oluştur', `${preview?.will_create ?? 0} kayıt oluşturulacak.`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Oluştur',
        onPress: async () => {
          setLoading(true);
          try {
            const response = await apiClient.post(API_ENDPOINTS.BULK_MAINTENANCE_STORE, payload()) as {
              success?: boolean;
              message?: string;
            };
            if (response?.success) {
              Alert.alert('Başarılı', response.message || 'Bakımlar oluşturuldu.', [
                { text: 'Tamam', onPress: () => navigation.navigate('Maintenance') },
              ]);
            } else {
              Alert.alert('Hata', response?.message || 'Kayıt oluşturulamadı.');
            }
          } catch (err: any) {
            Alert.alert('Hata', err?.response?.data?.message || err?.message || 'Kayıt oluşturulamadı.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }, [payload, preview, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader title="Toplu Bakım" showBack onBackPress={() => navigation.goBack()} onMenuPress={() => setSidebarVisible(true)} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Yıl / Ay / Başlangıç günü</Text>
        <View style={styles.row}>
          <TextInput style={styles.input} value={year} onChangeText={setYear} keyboardType="number-pad" />
          <TextInput style={styles.input} value={month} onChangeText={setMonth} keyboardType="number-pad" />
          <TextInput style={styles.input} value={startDay} onChangeText={setStartDay} keyboardType="number-pad" />
        </View>
        <Text style={styles.label}>Dağıtım gün sayısı (spread)</Text>
        <TextInput style={styles.inputFull} value={spreadDays} onChangeText={setSpreadDays} keyboardType="number-pad" />
        <TouchableOpacity style={styles.picker} onPress={() => setDistribution(d => d === 'spread' ? 'single_day' : 'spread')}>
          <Text>{distribution === 'spread' ? 'Günlere yay' : 'Tek güne topla'}</Text>
        </TouchableOpacity>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Tatilleri kaydır</Text>
          <Switch value={shiftHolidays} onValueChange={setShiftHolidays} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Sadece ücretli binalar</Text>
          <Switch value={onlyWithFee} onValueChange={setOnlyWithFee} />
        </View>
        <TouchableOpacity style={styles.btn} onPress={handlePreview} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Önizle</Text>}
        </TouchableOpacity>
        {preview ? (
          <View style={styles.card}>
            <Text style={styles.summary}>Oluşacak: {preview.will_create} · Atlanacak: {preview.will_skip} · Toplam: {preview.total}</Text>
            {(preview.items || []).slice(0, 20).map((item: any) => (
              <Text key={`${item.building_id}-${item.scheduled_date}`} style={styles.item}>
                {item.skipped ? '— ' : '✓ '}{item.building_name} · {item.scheduled_date}{item.skip_reason ? ` (${item.skip_reason})` : ''}
              </Text>
            ))}
            {(preview.items || []).length > 20 ? <Text style={styles.item}>… ve {(preview.items.length - 20)} kayıt daha</Text> : null}
            <TouchableOpacity style={[styles.btn, { marginTop: 12 }]} onPress={handleStore} disabled={loading || !preview.will_create}>
              <Text style={styles.btnText}>Kayıtları oluştur</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  content: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 40 },
  label: { color: COLORS.gray[600], marginBottom: 6, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.gray[200] },
  inputFull: { backgroundColor: 'white', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.gray[200], marginBottom: 12 },
  picker: { backgroundColor: 'white', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.gray[200], marginBottom: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  switchLabel: { color: COLORS.gray[800] },
  btn: { backgroundColor: COLORS.primary[600], borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '700' },
  card: { marginTop: 16, backgroundColor: 'white', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.gray[200] },
  summary: { fontWeight: '700', marginBottom: 8, color: COLORS.gray[900] },
  item: { color: COLORS.gray[700], marginBottom: 4, fontSize: DIMENSIONS.FONT_SIZE.SM },
});

export default BulkMaintenanceScreen;
