// 🏷️ ASANSÖR ETİKET TAKİBİ - Liste
// Etiket listesi, istatistikler, filtreler (API hazır olduğunda dolar)

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { ElevatorLabel } from '../../types';
import { apiClient } from '../../services/api/client';
import { API_ENDPOINTS } from '../../constants';
import { COLORS, DIMENSIONS } from '../../constants';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import EmptyState from '../../components/ui/EmptyState';
import { hapticFeedback } from '../../utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ElevatorLabelsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [items, setItems] = useState<ElevatorLabel[]>([]);
  const [stats, setStats] = useState<{ total?: number; aktif?: number; overdue?: number; due_soon_30?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const loadData = useCallback(async () => {
    // 10 saniye güvenlik timeout'u
    const timeoutId = setTimeout(() => {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }, 10000);

    try {
      const [listRes, statsRes] = await Promise.all([
        apiClient.get(API_ENDPOINTS.ELEVATOR_LABELS).catch(() => ({ data: [] })),
        apiClient.get(API_ENDPOINTS.ELEVATOR_LABEL_STATS).catch(() => ({ data: null })),
      ]);
      if (!isMounted.current) return;
      const list = Array.isArray((listRes as any)?.data) ? (listRes as any).data : (listRes as any)?.data?.data ?? [];
      setItems(list);
      setStats((statsRes as any)?.data ?? null);
    } catch {
      if (isMounted.current) {
        setItems([]);
        setStats(null);
      }
    } finally {
      clearTimeout(timeoutId);
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await loadData();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: ElevatorLabel }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        hapticFeedback.light();
        navigation.navigate('ElevatorLabelDetail', { elevatorLabelId: item.id });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.buildingName} numberOfLines={1}>{item.building?.name ?? `Etiket #${item.id}`}</Text>
        <View style={[styles.badge, { backgroundColor: COLORS.elevator[item.label_color] || COLORS.gray[300] }]}>
          <Text style={styles.badgeText}>{item.label_color_text}</Text>
        </View>
      </View>
      <Text style={styles.meta}>Kontrol: {item.control_date} · {item.status_text}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.title}>Etiket Takibi</Text>
        <View style={styles.menuBtn} />
      </View>

      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total ?? 0}</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.aktif ?? 0}</Text>
            <Text style={styles.statLabel}>Aktif</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.overdue ?? 0}</Text>
            <Text style={styles.statLabel}>Gecikmiş</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.due_soon_30 ?? 0}</Text>
            <Text style={styles.statLabel}>Yaklaşan</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={items.length === 0 ? styles.listEmpty : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary[500]]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="pricetag-outline"
              title="Etiket kaydı yok"
              message="Web panelinden etiket ekleyebilir veya API hazır olduğunda burada listelenecektir."
            />
          }
        />
      )}

      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
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
  menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: DIMENSIONS.FONT_SIZE.XL, fontWeight: '700', color: COLORS.gray[900] },
  statsRow: { flexDirection: 'row', padding: DIMENSIONS.SCREEN_PADDING, gap: 8, flexWrap: 'wrap' },
  statBox: {
    flex: 1,
    minWidth: 80,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    alignItems: 'center',
  },
  statValue: { fontSize: DIMENSIONS.FONT_SIZE.LG, fontWeight: '700', color: COLORS.primary[600] },
  statLabel: { fontSize: DIMENSIONS.FONT_SIZE.XS, color: COLORS.gray[600], marginTop: 4 },
  listContent: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 24 },
  listEmpty: { flex: 1, justifyContent: 'center', paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    padding: DIMENSIONS.CARD_PADDING,
    marginBottom: 12,
    ...DIMENSIONS.SHADOW_SM,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  buildingName: { fontSize: DIMENSIONS.FONT_SIZE.MD, fontWeight: '600', color: COLORS.gray[900], flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: DIMENSIONS.FONT_SIZE.XS, fontWeight: '600', color: COLORS.white },
  meta: { fontSize: DIMENSIONS.FONT_SIZE.SM, color: COLORS.gray[600] },
});

export default ElevatorLabelsScreen;
