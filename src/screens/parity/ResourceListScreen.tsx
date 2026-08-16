import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import AppHeader from '../../components/navigation/AppHeader';
import { apiClient } from '../../services/api/client';
import { COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback, formatCurrency } from '../../utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';

export interface ResourceRow {
  id: number;
  title: string;
  subtitle?: string;
  amount?: number;
  badge?: string;
}

interface Props {
  title: string;
  endpoint: string;
  mapItem: (raw: any) => ResourceRow;
  emptyTitle?: string;
  emptySubtitle?: string;
  onPressItem?: (item: ResourceRow, raw: any) => void;
}

const ResourceListScreen: React.FC<Props> = ({
  title,
  endpoint,
  mapItem,
  emptyTitle = 'Kayıt yok',
  emptySubtitle = 'Bu listede henüz kayıt bulunmuyor.',
  onPressItem,
}) => {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Array<ResourceRow & { raw: any }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      const response = await apiClient.get(endpoint) as { data?: any[] };
      const list = Array.isArray(response?.data) ? response.data : [];
      setItems(list.map((raw) => ({ ...mapItem(raw), raw })));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [endpoint, mapItem]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchList();
  }, [fetchList]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title={title}
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
      />
      {loading && items.length === 0 ? (
        <View style={styles.centered}><LoadingSpinner size="large" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await hapticFeedback.light();
                await fetchList();
              }}
              colors={[COLORS.primary[500]]}
            />
          }
          ListEmptyComponent={<EmptyState icon="document-outline" title={emptyTitle} subtitle={emptySubtitle} />}
          renderItem={({ item }) => {
            const inner = (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  {item.badge ? <Text style={styles.badge}>{item.badge}</Text> : null}
                </View>
                {item.subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{item.subtitle}</Text> : null}
                {item.amount != null ? <Text style={styles.amount}>{formatCurrency(item.amount)}</Text> : null}
              </View>
            );
            if (!onPressItem) return inner;
            return (
              <TouchableOpacity activeOpacity={0.7} onPress={() => onPressItem(item, item.raw)}>
                {inner}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 32 },
  card: {
    backgroundColor: 'white', borderRadius: DIMENSIONS.BORDER_RADIUS, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.gray[200],
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: DIMENSIONS.FONT_SIZE.BASE, fontWeight: '600', color: COLORS.gray[900] },
  badge: { fontSize: DIMENSIONS.FONT_SIZE.XS, color: COLORS.primary[700], backgroundColor: COLORS.primary[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  subtitle: { marginTop: 6, color: COLORS.gray[500], fontSize: DIMENSIONS.FONT_SIZE.SM },
  amount: { marginTop: 8, fontWeight: '700', color: COLORS.gray[800] },
});

export default ResourceListScreen;
