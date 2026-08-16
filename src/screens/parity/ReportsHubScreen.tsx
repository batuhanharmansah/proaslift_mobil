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

const ReportsHubScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [hub, setHub] = useState<any>(null);
  const [financial, setFinancial] = useState<any>(null);
  const [maintenance, setMaintenance] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const [hubRes, finRes, maintRes, empRes] = await Promise.all([
        apiClient.get(API_ENDPOINTS.REPORTS_HUB) as Promise<{ data?: any }>,
        apiClient.get(API_ENDPOINTS.REPORTS_FINANCIAL) as Promise<{ data?: any }>,
        apiClient.get(API_ENDPOINTS.REPORTS_MAINTENANCE) as Promise<{ data?: any }>,
        apiClient.get(API_ENDPOINTS.REPORTS_EMPLOYEE) as Promise<{ data?: any[] }>,
      ]);
      setHub(hubRes?.data ?? null);
      setFinancial(finRes?.data ?? null);
      setMaintenance(maintRes?.data ?? null);
      setEmployees(Array.isArray(empRes?.data) ? empRes.data : []);
    } catch {
      setHub(null);
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
      <AppHeader title="Raporlar" showBack onBackPress={() => navigation.goBack()} onMenuPress={() => setSidebarVisible(true)} />
      {loading && !hub ? (
        <View style={styles.centered}><LoadingSpinner size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await hapticFeedback.light(); await load(); }} />}
        >
          <Text style={styles.section}>Bu ay</Text>
          <View style={styles.grid}>
            <Stat label="Gelir" value={formatCurrency(hub?.monthly_income || 0)} />
            <Stat label="Gider" value={formatCurrency(hub?.monthly_expense || 0)} />
            <Stat label="Kâr" value={formatCurrency(hub?.monthly_profit || 0)} />
            <Stat label="Tamamlanan bakım" value={String(hub?.completed_maintenance ?? 0)} />
            <Stat label="Aktif bina" value={String(hub?.active_buildings ?? 0)} />
            <Stat label="Personel" value={String(hub?.total_employees ?? 0)} />
            <Stat label="Açık arıza" value={String(hub?.open_issues ?? 0)} />
            <Stat label="Düşük stok" value={String(hub?.low_stock_products ?? 0)} />
          </View>

          <Text style={styles.section}>Finansal dönem</Text>
          <View style={styles.card}>
            <Text style={styles.sub}>{financial?.start_date} – {financial?.end_date}</Text>
            <Text style={styles.line}>Gelir: {formatCurrency(financial?.income || 0)}</Text>
            <Text style={styles.line}>Gider: {formatCurrency(financial?.expense || 0)}</Text>
            <Text style={styles.lineBold}>Kâr: {formatCurrency(financial?.profit || 0)}</Text>
          </View>

          <Text style={styles.section}>Bakım performansı</Text>
          <View style={styles.card}>
            <Text style={styles.line}>Toplam: {maintenance?.total ?? 0}</Text>
            <Text style={styles.line}>Tamamlanan: {maintenance?.completed ?? 0}</Text>
            <Text style={styles.lineBold}>Tamamlanma: %{maintenance?.completion_rate ?? 0}</Text>
          </View>

          <Text style={styles.section}>Personel</Text>
          {employees.map((e) => (
            <View key={e.id} style={styles.card}>
              <Text style={styles.title}>{e.name}</Text>
              <Text style={styles.sub}>{e.completed_jobs}/{e.total_jobs} iş · %{e.completion_rate}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 40 },
  section: { marginTop: 16, marginBottom: 8, fontWeight: '700', color: COLORS.gray[800] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '48%', backgroundColor: 'white', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.gray[200] },
  statValue: { fontWeight: '700', color: COLORS.gray[900], fontSize: DIMENSIONS.FONT_SIZE.LG },
  statLabel: { color: COLORS.gray[500], marginTop: 4, fontSize: DIMENSIONS.FONT_SIZE.SM },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.gray[200] },
  title: { fontWeight: '600', color: COLORS.gray[900] },
  sub: { color: COLORS.gray[500], marginBottom: 6 },
  line: { color: COLORS.gray[700], marginTop: 2 },
  lineBold: { color: COLORS.gray[900], fontWeight: '700', marginTop: 6 },
});

export default ReportsHubScreen;
