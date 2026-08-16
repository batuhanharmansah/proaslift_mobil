import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import AppHeader from '../../components/navigation/AppHeader';
import { apiClient } from '../../services/api/client';
import { API_ENDPOINTS, COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback, formatCurrency } from '../../utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const HrFleetScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<any>({ bonuses: [], vehicles: [], absences: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.HR_FLEET) as { data?: any };
      setData(response?.data ?? { bonuses: [], vehicles: [], absences: [] });
    } catch {
      setData({ bonuses: [], vehicles: [], absences: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
  }, [load]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader title="Hakediş & Araç" showBack onBackPress={() => navigation.goBack()} onMenuPress={() => setSidebarVisible(true)} />
      {loading ? (
        <View style={styles.centered}><LoadingSpinner size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await hapticFeedback.light(); await load(); }} />}
        >
          <Text style={styles.section}>Araçlar</Text>
          {(data.vehicles || []).length === 0 ? <Text style={styles.muted}>Araç kaydı yok.</Text> : data.vehicles.map((v: any) => (
            <View key={v.id} style={styles.card}>
              <Text style={styles.title}>{v.plate} · {v.brand_model}</Text>
              <Text style={styles.sub}>Sürücü: {v.driver_name || '—'}</Text>
              <Text style={styles.sub}>Muayene: {v.inspection_due_date || '—'} · Sigorta: {v.insurance_due_date || '—'}</Text>
            </View>
          ))}
          <Text style={styles.section}>Hakediş / prim</Text>
          {(data.bonuses || []).length === 0 ? <Text style={styles.muted}>Kayıt yok.</Text> : data.bonuses.map((b: any) => (
            <View key={b.id} style={styles.card}>
              <Text style={styles.title}>{b.employee_name}</Text>
              <Text style={styles.sub}>{b.bonus_date} · {b.type} · {formatCurrency(b.amount || 0)}</Text>
              {b.description ? <Text style={styles.sub}>{b.description}</Text> : null}
            </View>
          ))}
          <Text style={styles.section}>Devamsızlık</Text>
          {(data.absences || []).length === 0 ? <Text style={styles.muted}>Kayıt yok.</Text> : data.absences.map((a: any) => (
            <View key={a.id} style={styles.card}>
              <Text style={styles.title}>{a.employee_name}</Text>
              <Text style={styles.sub}>{a.start_date} – {a.end_date} · {a.type}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 40 },
  section: { marginTop: 16, marginBottom: 8, fontWeight: '700', color: COLORS.gray[800] },
  muted: { color: COLORS.gray[500], marginBottom: 8 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.gray[200] },
  title: { fontWeight: '600', color: COLORS.gray[900] },
  sub: { color: COLORS.gray[500], marginTop: 4, fontSize: DIMENSIONS.FONT_SIZE.SM },
});

export default HrFleetScreen;
