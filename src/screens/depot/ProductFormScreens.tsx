import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import KeyboardAwareScrollView from '../../components/ui/KeyboardAwareScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { COLORS, DIMENSIONS, API_ENDPOINTS } from '../../constants';
import { apiClient } from '../../services/api/client';
import { hapticFeedback } from '../../utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'yedek_parca', label: 'Yedek Parça' },
  { value: 'arac_gerec', label: 'Araç Gereç' },
  { value: 'kimyasal', label: 'Kimyasal' },
  { value: 'elektronik', label: 'Elektronik' },
  { value: 'mekanik', label: 'Mekanik' },
];

interface ProductFormProps {
  mode: 'create' | 'edit';
  productId?: number;
}

const ProductForm: React.FC<ProductFormProps> = ({ mode, productId }) => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('yedek_parca');
  const [unit, setUnit] = useState('adet');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [minStock, setMinStock] = useState('0');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (mode !== 'edit' || !productId) return;
    const load = async () => {
      try {
        const response = await apiClient.get(API_ENDPOINTS.PRODUCT_DETAIL(productId)) as { data?: any };
        const p = response?.data;
        if (!p?.id) {
          Alert.alert('Hata', 'Ürün bulunamadı.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
          return;
        }
        setName(p.name || '');
        setCode(p.code || '');
        setCategory(p.category || 'yedek_parca');
        setUnit(p.unit || 'adet');
        setCostPrice(String(p.cost_price ?? ''));
        setSalePrice(String(p.sale_price ?? ''));
        setStockQuantity(String(p.stock_quantity ?? '0'));
        setMinStock(String(p.min_stock_level ?? '0'));
        setSupplier(p.supplier || '');
        setLocation(p.location || '');
        setDescription(p.description || '');
        setNotes(p.notes || '');
      } catch (err: any) {
        Alert.alert('Hata', err?.message || 'Ürün yüklenemedi.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mode, productId, navigation]);

  const pickCategory = useCallback(() => {
    hapticFeedback.light();
    Alert.alert('Kategori', '', CATEGORIES.map(({ value, label }) => ({
      text: label,
      onPress: () => setCategory(value),
    })));
  }, []);

  const handleSubmit = useCallback(async () => {
    const cost = parseFloat(costPrice.replace(',', '.'));
    const sale = parseFloat(salePrice.replace(',', '.'));
    const stock = parseInt(stockQuantity, 10);
    const min = parseInt(minStock, 10);

    if (!name.trim() || !code.trim()) {
      Alert.alert('Hata', 'Ürün adı ve marka/kod zorunludur.');
      return;
    }
    if (Number.isNaN(cost) || cost < 0 || Number.isNaN(sale) || sale < 0) {
      Alert.alert('Hata', 'Fiyatlar geçerli bir sayı olmalı.');
      return;
    }
    if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(min) || min < 0) {
      Alert.alert('Hata', 'Stok değerleri 0 veya daha büyük olmalı.');
      return;
    }

    const payload = {
      name: name.trim(),
      code: code.trim(),
      category,
      unit: unit.trim() || 'adet',
      cost_price: cost,
      sale_price: sale,
      stock_quantity: stock,
      min_stock_level: min,
      supplier: supplier.trim() || null,
      location: location.trim() || null,
      description: description.trim() || null,
      notes: notes.trim() || null,
    };

    await hapticFeedback.light();
    setSaving(true);
    try {
      const response = mode === 'create'
        ? await apiClient.post(API_ENDPOINTS.PRODUCTS, payload) as { success?: boolean; data?: { id: number }; message?: string }
        : await apiClient.put(API_ENDPOINTS.PRODUCT_DETAIL(productId as number), payload) as { success?: boolean; data?: { id: number }; message?: string };

      if (response?.success) {
        const id = response.data?.id || productId;
        Alert.alert('Başarılı', mode === 'create' ? 'Ürün eklendi.' : 'Ürün güncellendi.', [
          { text: 'Tamam', onPress: () => (id ? navigation.navigate('ProductDetail', { productId: id }) : navigation.navigate('Depot')) },
        ]);
      } else {
        Alert.alert('Hata', response?.message || 'Kayıt başarısız.');
      }
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      Alert.alert('Hata', errors ? Object.values(errors).flat().join('\n') : (err?.response?.data?.message || err?.message || 'Kayıt başarısız.'));
    } finally {
      setSaving(false);
    }
  }, [name, code, category, unit, costPrice, salePrice, stockQuantity, minStock, supplier, location, description, notes, mode, productId, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary[500]} /></View>
      </SafeAreaView>
    );
  }

  const categoryLabel = CATEGORIES.find(c => c.value === category)?.label ?? category;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
        <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput style={styles.input} placeholder="Ürün adı *" placeholderTextColor={COLORS.gray[400]} value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Marka / kod *" placeholderTextColor={COLORS.gray[400]} value={code} onChangeText={setCode} autoCapitalize="characters" />
          <TouchableOpacity style={styles.picker} onPress={pickCategory}>
            <Text style={styles.pickerText}>{categoryLabel}</Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.gray[600]} />
          </TouchableOpacity>
          <TextInput style={styles.input} placeholder="Birim (adet, kg...)" placeholderTextColor={COLORS.gray[400]} value={unit} onChangeText={setUnit} />
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.half]} placeholder="Alış fiyatı *" placeholderTextColor={COLORS.gray[400]} value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" />
            <TextInput style={[styles.input, styles.half]} placeholder="Satış fiyatı *" placeholderTextColor={COLORS.gray[400]} value={salePrice} onChangeText={setSalePrice} keyboardType="decimal-pad" />
          </View>
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.half]} placeholder="Stok *" placeholderTextColor={COLORS.gray[400]} value={stockQuantity} onChangeText={setStockQuantity} keyboardType="number-pad" />
            <TextInput style={[styles.input, styles.half]} placeholder="Min. stok *" placeholderTextColor={COLORS.gray[400]} value={minStock} onChangeText={setMinStock} keyboardType="number-pad" />
          </View>
          <TextInput style={styles.input} placeholder="Tedarikçi" placeholderTextColor={COLORS.gray[400]} value={supplier} onChangeText={setSupplier} />
          <TextInput style={styles.input} placeholder="Lokasyon" placeholderTextColor={COLORS.gray[400]} value={location} onChangeText={setLocation} />
          <TextInput style={[styles.input, styles.multiline]} placeholder="Açıklama" placeholderTextColor={COLORS.gray[400]} value={description} onChangeText={setDescription} multiline />
          <TextInput style={[styles.input, styles.multiline]} placeholder="Not" placeholderTextColor={COLORS.gray[400]} value={notes} onChangeText={setNotes} multiline />
          <TouchableOpacity style={[styles.submit, saving && { opacity: 0.7 }]} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>{mode === 'create' ? 'Ürün Ekle' : 'Kaydet'}</Text>}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export const ProductCreateScreen: React.FC = () => <ProductForm mode="create" />;

export const ProductEditScreen: React.FC = () => {
  const { productId } = useRoute<RouteProp<RootStackParamList, 'ProductEdit'>>().params;
  return <ProductForm mode="edit" productId={productId} />;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 40 },
  input: {
    backgroundColor: 'white', borderRadius: DIMENSIONS.BORDER_RADIUS, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: DIMENSIONS.FONT_SIZE.BASE, color: COLORS.gray[900], borderWidth: 1, borderColor: COLORS.gray[200], marginBottom: 10,
  },
  multiline: { minHeight: 72 },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white',
    borderRadius: DIMENSIONS.BORDER_RADIUS, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.gray[200], marginBottom: 10,
  },
  pickerText: { fontSize: DIMENSIONS.FONT_SIZE.BASE, color: COLORS.gray[900] },
  submit: { backgroundColor: COLORS.primary[600], borderRadius: DIMENSIONS.BORDER_RADIUS, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  submitText: { color: 'white', fontWeight: '600', fontSize: DIMENSIONS.FONT_SIZE.BASE },
});

export default ProductCreateScreen;
