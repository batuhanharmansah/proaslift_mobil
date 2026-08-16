import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { API_ENDPOINTS, COLORS, DIMENSIONS } from '../../constants';
import { apiClient } from '../../services/api/client';
import { formatCurrency } from '../../utils';

type DetailRoute = RouteProp<RootStackParamList, 'QuotationDetail'>;

const QuotationDetailScreen: React.FC = () => {
  const { quotationId } = useRoute<DetailRoute>().params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await apiClient.get(API_ENDPOINTS.QUOTATION_DETAIL(quotationId)) as { data?: any };
        if (!cancelled) setData(response?.data ?? null);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    setLoading(true);
    load();
    return () => { cancelled = true; };
  }, [quotationId]));

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary[500]} /></View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}><Text style={styles.muted}>Teklif bulunamadı.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{data.quote_no}</Text>
        <Text style={styles.meta}>{data.type_label} · {data.status_label}</Text>
        <View style={styles.card}>
          <Row label="Müşteri" value={data.customer_name} />
          {data.customer_phone ? <Row label="Telefon" value={data.customer_phone} /> : null}
          {data.building_name ? <Row label="Bina" value={data.building_name} /> : null}
          {data.valid_until ? <Row label="Geçerlilik" value={data.valid_until} /> : null}
          {data.scope_summary ? <Row label="Kapsam" value={data.scope_summary} /> : null}
          <Row label="Toplam" value={formatCurrency(data.grand_total || 0)} />
        </View>
        {(data.items || []).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.section}>Kalemler</Text>
            {data.items.map((item: any) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} {item.unit || ''} · {formatCurrency(item.line_total || 0)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 40 },
  title: { fontSize: DIMENSIONS.FONT_SIZE.XL, fontWeight: '700', color: COLORS.gray[900] },
  meta: { marginTop: 4, color: COLORS.gray[500] },
  muted: { color: COLORS.gray[500] },
  card: { backgroundColor: 'white', borderRadius: DIMENSIONS.BORDER_RADIUS, padding: 16, marginTop: 16, borderWidth: 1, borderColor: COLORS.gray[200] },
  section: { fontWeight: '700', marginBottom: 12, color: COLORS.gray[800] },
  label: { fontSize: DIMENSIONS.FONT_SIZE.SM, color: COLORS.gray[500] },
  value: { fontSize: DIMENSIONS.FONT_SIZE.BASE, color: COLORS.gray[900], marginTop: 2 },
  itemRow: { marginBottom: 10 },
  itemDesc: { color: COLORS.gray[900], fontWeight: '500' },
  itemMeta: { color: COLORS.gray[500], marginTop: 2, fontSize: DIMENSIONS.FONT_SIZE.SM },
});

export default QuotationDetailScreen;
