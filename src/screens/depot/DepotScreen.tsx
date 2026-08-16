// 📦 Depo – Ürün stokları (web’deki depo verisi)
// Admin mobilde hangi üründen kaç adet olduğunu görür

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import { apiClient } from '../../services/api/client';
import { API_ENDPOINTS, COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback } from '../../utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';

interface DepotProduct {
  id: number;
  name: string;
  code: string;
  category: string;
  category_label: string;
  unit: string;
  sale_price: number;
  stock_quantity: number;
  min_stock_level?: number;
}

const DepotScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [products, setProducts] = useState<DepotProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS) as {
        success?: boolean;
        data?: DepotProduct[];
      };
      const list = response?.data ?? [];
      setProducts(Array.isArray(list) ? list : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProducts();
    }, [fetchProducts])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchProducts();
  }, [fetchProducts]);

  const renderItem = useCallback(({ item }: { item: DepotProduct }) => {
    const minLevel = item.min_stock_level ?? 0;
    const isBelowMin = minLevel > 0 && item.stock_quantity < minLevel;
    const unitLabel = item.unit || 'adet';
    return (
      <TouchableOpacity
        style={[styles.card, isBelowMin && styles.cardLow]}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.productName, isBelowMin && styles.productNameLow]} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.stockBadge, isBelowMin && styles.stockBadgeLow]}>
            <Text style={[styles.stockText, isBelowMin && styles.stockTextLow]}>
              {item.stock_quantity} {unitLabel}
            </Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          {item.code ? (
            <Text style={styles.code}>Marka: {item.code}</Text>
          ) : null}
          {minLevel > 0 && (
            <Text style={[styles.minLabel, isBelowMin && styles.minLabelLow]}>
              Min: {minLevel} {unitLabel}
            </Text>
          )}
          <Text style={styles.category}>{item.category_label || item.category || '—'}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setSidebarVisible(true)}
      >
        <Ionicons name="menu" size={28} color="white" />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>Depo</Text>
        <Text style={styles.headerSubtitle}>{products.length} ürün</Text>
      </View>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => navigation.navigate('ProductCreate')}
        accessibilityLabel="Yeni ürün"
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );

  if (loading && products.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.centered}>
          <LoadingSpinner size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />
      {renderHeader()}
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary[500]]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="Ürün bulunamadı"
            subtitle="Depoda henüz ürün kaydı yok. Sağ üstteki + ile ekleyebilirsiniz."
          />
        }
      />
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
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingTop: 20,
    paddingBottom: 20,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[200],
  },
  listContent: {
    padding: DIMENSIONS.SCREEN_PADDING,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  cardLow: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error[500],
    backgroundColor: COLORS.error[50],
    borderColor: COLORS.error[200],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productName: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
    flex: 1,
    marginRight: 12,
  },
  stockBadge: {
    backgroundColor: COLORS.primary[100],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stockBadgeLow: {
    backgroundColor: COLORS.error[100],
  },
  stockText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '700',
    color: COLORS.gray[900],
  },
  stockTextLow: {
    color: COLORS.error[700],
  },
  productNameLow: {
    color: COLORS.error[700],
  },
  minLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[500],
  },
  minLabelLow: {
    color: COLORS.error[600],
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  code: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[500],
  },
  category: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DepotScreen;
