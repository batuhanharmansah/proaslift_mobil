// 🚨 ARİZA BİLDİRİMİ - Liste ekranı
// Filtreler, istatistikler, yeni arıza FAB

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { IssueReport } from '../../types';
import { apiClient } from '../../services/api/client';
import { API_ENDPOINTS } from '../../constants';
import { COLORS, DIMENSIONS, STATUS_CONFIG } from '../../constants';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import EmptyState from '../../components/ui/EmptyState';
import { hapticFeedback } from '../../utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const IssuesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [stats, setStats] = useState<{ total?: number; bildirildi?: number; tamamlandi?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadIssues = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const res = await apiClient.get(API_ENDPOINTS.ISSUE_REPORTS, {
        params: { page: pageNum, per_page: 20 },
      }) as { success?: boolean; data?: IssueReport[]; pagination?: { current_page: number; last_page: number } };
      const list = Array.isArray((res as any)?.data) ? (res as any).data : (res as any)?.data?.data ?? [];
      const pagination = (res as any)?.pagination;
      if (append) {
        setIssues((prev) => (pageNum === 1 ? list : [...prev, ...list]));
      } else {
        setIssues(list);
      }
      setPage(pageNum);
      setHasMore(pagination ? pagination.current_page < pagination.last_page : false);
    } catch (e) {
      if (!append) setIssues([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.ISSUE_STATS) as { success?: boolean; data?: Record<string, number> };
      setStats((res as any)?.data ?? null);
    } catch {
      setStats(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadIssues(1, false);
      loadStats();
    }, [loadIssues, loadStats])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await Promise.all([loadIssues(1, false), loadStats()]);
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: IssueReport }) => {
    const statusConf = STATUS_CONFIG.issue[item.status as keyof typeof STATUS_CONFIG.issue] || { label: item.status, color: COLORS.gray[500] };
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          hapticFeedback.light();
          navigation.navigate('IssueDetail', { issueId: item.id });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.buildingName} numberOfLines={1}>{item.building?.name ?? `#${item.id}`}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConf.bgColor || COLORS.gray[100] }]}>
            <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        <View style={styles.meta}>
          <Text style={styles.priority}>{item.priority_label}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.title}>Arıza Bildirimi</Text>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            navigation.navigate('IssueCreate');
          }}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total ?? 0}</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.bildirildi ?? 0}</Text>
            <Text style={styles.statLabel}>Bildirildi</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.tamamlandi ?? 0}</Text>
            <Text style={styles.statLabel}>Tamamlandı</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={issues}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={issues.length === 0 ? styles.listEmpty : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary[500]]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="warning-outline"
              title="Arıza kaydı yok"
              message="Yeni arıza eklemek için + butonuna basın."
            />
          }
          onEndReached={() => hasMore && !loadingMore && loadIssues(page + 1, true)}
          onEndReachedThreshold={0.3}
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
  menuBtn: { padding: 8 },
  title: { fontSize: DIMENSIONS.FONT_SIZE.XL, fontWeight: '700', color: COLORS.gray[900] },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    padding: DIMENSIONS.SCREEN_PADDING,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    alignItems: 'center',
  },
  statValue: { fontSize: DIMENSIONS.FONT_SIZE.XL, fontWeight: '700', color: COLORS.primary[600] },
  statLabel: { fontSize: DIMENSIONS.FONT_SIZE.XS, color: COLORS.gray[600], marginTop: 4 },
  listContent: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 24 },
  listEmpty: { flex: 1, justifyContent: 'center', paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    padding: DIMENSIONS.CARD_PADDING,
    marginBottom: 12,
    ...DIMENSIONS.SHADOW_SM,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  buildingName: { fontSize: DIMENSIONS.FONT_SIZE.MD, fontWeight: '600', color: COLORS.gray[900], flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: DIMENSIONS.FONT_SIZE.XS, fontWeight: '600' },
  description: { fontSize: DIMENSIONS.FONT_SIZE.SM, color: COLORS.gray[700], marginBottom: 8 },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  priority: { fontSize: DIMENSIONS.FONT_SIZE.XS, color: COLORS.gray[500] },
  date: { fontSize: DIMENSIONS.FONT_SIZE.XS, color: COLORS.gray[500] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default IssuesScreen;
