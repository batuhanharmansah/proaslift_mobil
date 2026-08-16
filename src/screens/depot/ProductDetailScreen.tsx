import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { COLORS, DIMENSIONS, API_ENDPOINTS } from '../../constants';
import { apiClient } from '../../services/api/client';
import { hapticFeedback, formatCurrency } from '../../utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RouteProp<RootStackParamList, 'ProductDetail'>;

interface ProductDetail {
  id: number;
  name: string;
  code: string;
  description?: string;
  category: string;
  category_label: string;
  unit: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock_level: number;
  supplier?: string;
  location?: string;
  notes?: string;
  is_active: boolean;
  stock_status: string;
  stock_status_label: string;
}

const ProductDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { productId } = useRoute<DetailRoute>().params;
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProduct = useCallback(async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCT_DETAIL(productId)) as {
        success?: boolean;
        data?: ProductDetail;
      };
      setProduct(response?.data ?? null);
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchProduct();
  }, [fetchProduct]));

  const handleDelete = useCallback(() => {
    Alert.alert('Ürünü Sil', `${product?.name || 'Bu ürün'} silinecek.`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await hapticFeedback.medium();
            const response = await apiClient.delete(API_ENDPOINTS.PRODUCT_DETAIL(productId)) as {
              success?: boolean;
              message?: string;
            };
            if (response?.success) {
              Alert.alert('Başarılı', response.message || 'Ürün silindi.', [
                { text: 'Tamam', onPress: () => navigation.navigate('Depot') },
              ]);
            } else {
              Alert.alert('Hata', response?.message || 'Ürün silinemedi.');
            }
          } catch (err: any) {
            Alert.alert('Hata', err?.response?.data?.message || err?.message || 'Ürün silinemedi.');
          }
        },
      },
    ]);
  }, [product?.name, productId, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary[500]} /></View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}><Text style={styles.muted}>Ürün bulunamadı.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.meta}>{product.category_label} · {product.code}</Text>
        <View style={[styles.badge, product.stock_status !== 'in_stock' && styles.badgeWarn]}>
          <Text style={styles.badgeText}>{product.stock_quantity} {product.unit} · {product.stock_status_label}</Text>
        </View>

        <View style={styles.card}>
          <Row label="Alış fiyatı" value={formatCurrency(product.cost_price)} />
          <Row label="Satış fiyatı" value={formatCurrency(product.sale_price)} />
          <Row label="Min. stok" value={`${product.min_stock_level} ${product.unit}`} />
          {product.supplier ? <Row label="Tedarikçi" value={product.supplier} /> : null}
          {product.location ? <Row label="Lokasyon" value={product.location} /> : null}
          {product.description ? <Row label="Açıklama" value={product.description} /> : null}
          {product.notes ? <Row label="Not" value={product.notes} /> : null}
        </View>

        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('ProductEdit', { productId })}>
          <Ionicons name="create-outline" size={20} color="white" />
          <Text style={styles.btnText}>Düzenle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={COLORS.error[600]} />
          <Text style={styles.deleteText}>Sil</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 40 },
  name: { fontSize: DIMENSIONS.FONT_SIZE.XL, fontWeight: '700', color: COLORS.gray[900] },
  meta: { marginTop: 4, color: COLORS.gray[500], fontSize: DIMENSIONS.FONT_SIZE.SM },
  muted: { color: COLORS.gray[500] },
  badge: { alignSelf: 'flex-start', marginTop: 12, backgroundColor: COLORS.primary[100], paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeWarn: { backgroundColor: COLORS.error[100] },
  badgeText: { fontWeight: '600', color: COLORS.gray[800] },
  card: { backgroundColor: 'white', borderRadius: DIMENSIONS.BORDER_RADIUS, padding: 16, marginTop: 16, borderWidth: 1, borderColor: COLORS.gray[200] },
  row: { marginBottom: 12 },
  label: { fontSize: DIMENSIONS.FONT_SIZE.SM, color: COLORS.gray[500], marginBottom: 2 },
  value: { fontSize: DIMENSIONS.FONT_SIZE.BASE, color: COLORS.gray[900] },
  editBtn: { marginTop: 24, backgroundColor: COLORS.primary[600], borderRadius: DIMENSIONS.BORDER_RADIUS, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnText: { color: 'white', fontWeight: '600' },
  deleteBtn: { marginTop: 12, borderRadius: DIMENSIONS.BORDER_RADIUS, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.error[200] },
  deleteText: { color: COLORS.error[600], fontWeight: '600' },
});

export default ProductDetailScreen;
