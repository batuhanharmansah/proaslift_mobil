// 📋 CREATE MAINTENANCE REPORT SCREEN
// Bakım Raporu Oluşturma - Standard + Rutin (Web ile uyumlu)

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import KeyboardAwareScrollView from '../../components/ui/KeyboardAwareScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import LazyImage from '../../components/ui/LazyImage';
import { MaintenanceSchedule, UsedProduct, ProductOption } from '../../types';
import { apiClient } from '../../services/api/client';
import { locationService } from '../../services/location/LocationService';
import { API_ENDPOINTS, COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback } from '../../utils';
import { formatTime } from '../../utils/dateUtils';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import RoutineReportForm, { RoutineReportFormData } from '../../components/reports/RoutineReportForm';

interface Props {
  route: {
    params: {
      maintenanceScheduleId: number;
      maintenanceSchedule: MaintenanceSchedule;
    };
  };
  navigation: any;
}

const CreateMaintenanceReportScreen: React.FC<Props> = ({ route, navigation }) => {
  const params = route?.params ?? {};
  const maintenanceSchedule = params.maintenanceSchedule ?? {};
  const maintenanceScheduleId = params.maintenanceScheduleId ?? 0;
  const isRoutine = (maintenanceSchedule?.maintenance_type ?? '') === 'rutin_bakim';

  // ==================== STATE ====================
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(!isRoutine);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productPickerIndex, setProductPickerIndex] = useState<number | null>(null);

  // Form state (Standard report)
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [workDescription, setWorkDescription] = useState('');
  const [usedProducts, setUsedProducts] = useState<UsedProduct[]>([
    { quantity: 1, unit: 'adet', unit_price: 0 },
  ]);
  const [problemsFound, setProblemsFound] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [completionStatus, setCompletionStatus] = useState<'tamamlandi' | 'kismi_tamamlandi' | 'ertelendi'>('tamamlandi');
  const [customerSignature, setCustomerSignature] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (!isRoutine) {
      (async () => {
        try {
          const res = await apiClient.get(API_ENDPOINTS.MAINTENANCE_PRODUCTS) as { success?: boolean; data?: ProductOption[]; message?: string };
          if (res?.success && Array.isArray(res?.data)) {
            setProducts(res.data);
          } else {
            setProducts([]);
          }
        } catch (error: any) {
          setProducts([]);
        } finally {
          setLoading(false);
        }
      })();
    }
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf eklemek için galeri erişim izni gereklidir.');
      }
    })();
  }, [isRoutine]);

  // ==================== HANDLERS ====================
  const calculateTotalCost = useCallback((): number => {
    return usedProducts.reduce((total, product) => {
      const quantity = product.quantity || 0;
      const unitPrice = product.unit_price || 0;
      return total + (quantity * unitPrice);
    }, 0);
  }, [usedProducts]);

  const handleAddProduct = useCallback(() => {
    hapticFeedback.light();
    setUsedProducts([...usedProducts, { quantity: 1, unit: 'adet', unit_price: 0 }]);
  }, [usedProducts]);

  const handleRemoveProduct = useCallback((index: number) => {
    hapticFeedback.light();
    if (usedProducts.length > 1) {
      setUsedProducts(prev => prev.filter((_, i) => i !== index));
    } else {
      setUsedProducts([{ quantity: 1, unit: 'adet', unit_price: 0 }]);
    }
  }, [usedProducts]);

  const handleProductChange = useCallback((index: number, field: keyof UsedProduct, value: any) => {
    setUsedProducts(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const handleSelectProduct = useCallback((index: number, product: ProductOption) => {
    hapticFeedback.light();
    setUsedProducts(prev => {
      const next = [...prev];
      next[index] = { ...next[index], product_id: product.id, name: product.name, unit: product.unit, unit_price: product.sale_price };
      return next;
    });
    setProductPickerIndex(null);
  }, []);

  const buildReportSuccessMessage = (res: { data?: { approval_sms_sent?: boolean; approval_sms_error?: string } }, base: string) => {
    const sent = res?.data?.approval_sms_sent;
    const err = res?.data?.approval_sms_error;
    if (sent) return `${base} Bina yöneticisine onay SMS'i gönderildi.`;
    if (err === 'no_contact') return `${base} Uyarı: Bina iletişim telefonu tanımlı değil, onay SMS gönderilemedi.`;
    if (err === 'invalid_phone') return `${base} Uyarı: Geçersiz telefon, onay SMS gönderilemedi.`;
    if (err === 'cooldown') return `${base} Onay bekleniyor (SMS daha önce gönderildi).`;
    return base;
  };

  const handleRoutineSubmit = useCallback(async (data: RoutineReportFormData) => {
    try {
      const payload: Record<string, unknown> = {
        start_time: data.start_time,
        end_time: data.end_time ?? null,
        recommendations: data.recommendations ?? '',
        completion_status: data.completion_status,
        customer_name: data.customer_name ?? '',
        customer_notes: data.customer_notes ?? '',
        routine_maintenance_checklist: JSON.stringify(data.routine_maintenance_checklist),
        completion_percentage: data.completion_percentage,
      };
      Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });
      const res = await apiClient.post(API_ENDPOINTS.MAINTENANCE_STORE_REPORT(maintenanceScheduleId), payload) as { success?: boolean; message?: string; data?: { approval_sms_sent?: boolean; approval_sms_error?: string } };
      if (res?.success !== false) {
        locationService.stopTracking();
        hapticFeedback.success();
        Alert.alert('Başarılı', buildReportSuccessMessage(res, 'Rutin bakım raporu kaydedildi.'), [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
      } else throw new Error(res?.message ?? 'Kayıt başarısız');
    } catch (e: any) {
      hapticFeedback.error();
      Alert.alert('Hata', e?.message ?? 'Rapor kaydedilemedi.');
    }
  }, [maintenanceScheduleId, navigation]);

  const handlePickImages = useCallback(async () => {
    try {
      hapticFeedback.light();
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map(asset => asset.uri);
        setPhotos([...photos, ...newPhotos]);
      }
    } catch (error) {
      console.error('❌ Image picker error:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
    }
  }, [photos]);

  const handleTakePhoto = useCallback(async () => {
    try {
      hapticFeedback.light();
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf çekmek için kamera erişim izni gereklidir.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('❌ Camera error:', error);
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu.');
    }
  }, [photos]);

  const handleRemovePhoto = useCallback((index: number) => {
    hapticFeedback.light();
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
  }, [photos]);

  const handleSubmit = useCallback(async (action: 'draft' | 'complete') => {
    if (!workDescription.trim() || workDescription.trim().length < 10) {
      Alert.alert('Eksik Bilgi', 'Lütfen yapılan işleri en az 10 karakter açıklayın.');
      return;
    }
    if (action === 'complete' && !endTime) {
      Alert.alert('Eksik Bilgi', 'Tamamlanmış işler için bitiş zamanı gereklidir.');
      return;
    }
    const validProducts = usedProducts.filter(p => p.product_id && (p.quantity ?? 0) > 0);
    if (validProducts.some(p => !p.unit_price && p.unit_price !== 0)) {
      Alert.alert('Eksik Bilgi', 'Ürün seçtiğinizde birim fiyat otomatik gelir. Lütfen ürün seçin.');
      return;
    }

    try {
      setSubmitting(true);
      hapticFeedback.medium();

      const payload = {
        start_time: startTime.toISOString(),
        end_time: endTime?.toISOString(),
        work_description: workDescription.trim(),
        used_products: validProducts.map(p => ({
          product_id: p.product_id,
          quantity: p.quantity ?? 1,
          unit_price: p.unit_price ?? 0,
        })),
        problems_found: problemsFound.trim() || undefined,
        recommendations: recommendations.trim() || undefined,
        completion_status: completionStatus,
        customer_signature: customerSignature,
        customer_name: customerName.trim() || undefined,
        customer_notes: customerNotes.trim() || undefined,
      };

      const response = await apiClient.post(API_ENDPOINTS.MAINTENANCE_STORE_REPORT(maintenanceScheduleId), payload) as { success?: boolean; message?: string; data?: { approval_sms_sent?: boolean; approval_sms_error?: string } };

      if (response?.success !== false) {
        if (action === 'complete') {
          locationService.stopTracking();
        }
        hapticFeedback.success();
        const base = action === 'complete' ? 'Rapor tamamlandı!' : 'Rapor kaydedildi!';
        Alert.alert('Başarılı', buildReportSuccessMessage(response, base), [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
      } else throw new Error(response?.message ?? 'Kayıt başarısız');
    } catch (error: any) {
      hapticFeedback.error();
      Alert.alert('Hata', error?.message ?? 'Rapor kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  }, [
    workDescription,
    usedProducts,
    endTime,
    startTime,
    problemsFound,
    recommendations,
    completionStatus,
    customerSignature,
    customerName,
    customerNotes,
    maintenanceScheduleId,
    navigation,
  ]);

  // ==================== RENDER HELPERS ====================
  const renderProductRow = (product: UsedProduct, index: number) => (
    <View key={index} style={styles.productRow}>
      <View style={styles.productContent}>
        <TouchableOpacity
          style={styles.productSelectBtn}
          onPress={() => setProductPickerIndex(index)}
        >
          <Text style={[styles.productSelectText, !product.name && styles.productSelectPlaceholder]}>
            {product.name ? `${product.name} - ₺${(product.unit_price ?? 0).toFixed(2)}` : 'Ürün Seçin'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.gray[500]} />
        </TouchableOpacity>
        <View style={styles.productRowBottom}>
          <TextInput
            style={[styles.productInput, styles.productInputSmall]}
            placeholder="Miktar"
            keyboardType="numeric"
            value={product.quantity?.toString()}
            onChangeText={(text) => handleProductChange(index, 'quantity', parseFloat(text) || 0)}
          />
          <Text style={[styles.productInput, styles.productInputSmall, styles.unitPriceReadonly]}>
            {product.unit_price != null ? `₺${(product.unit_price * (product.quantity || 1)).toFixed(2)}` : '-'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveProduct(index)}>
        <Ionicons name="close-circle" size={24} color={COLORS.error[500]} />
      </TouchableOpacity>
    </View>
  );

  const renderPhotoGrid = () => {
    if (photos.length === 0) return null;

    return (
      <View style={styles.photoGrid}>
        {photos.map((uri, index) => (
          <View key={index} style={styles.photoItem}>
            <LazyImage source={{ uri }} style={styles.photo} resizeMode="cover" />
            <TouchableOpacity
              style={styles.photoRemoveButton}
              onPress={() => handleRemovePhoto(index)}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.error[500]} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  // ==================== RENDER ====================
  if (isRoutine) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
        <AppHeader
          title="Rutin Bakım Raporu"
          showBack
          onBackPress={() => navigation.goBack()}
          onMenuPress={() => setSidebarVisible(true)}
        />
        <RoutineReportForm maintenanceSchedule={maintenanceSchedule} onSubmit={handleRoutineSubmit} />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
        <AppHeader
          title="Bakım Raporu"
          showBack
          onBackPress={() => navigation.goBack()}
          onMenuPress={() => setSidebarVisible(true)}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary[600]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Product Picker Modal */}
      <Modal visible={productPickerIndex !== null} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setProductPickerIndex(null)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Ürün Seçin</Text>
            {products.length === 0 ? (
              <View style={styles.emptyProductList}>
                <Ionicons name="cube-outline" size={48} color={COLORS.gray[400]} />
                <Text style={styles.emptyProductText}>Depoda kayıt bulunamadı.</Text>
                <Text style={styles.emptyProductSubtext}>Web panelinden ürün ekleyebilirsiniz.</Text>
              </View>
            ) : (
              <FlatList
                data={products}
                keyExtractor={p => String(p.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.modalItem} onPress={() => productPickerIndex != null && handleSelectProduct(productPickerIndex, item)}>
                    <Text style={styles.modalItemName}>{item.name}{item.code ? ` · Marka: ${item.code}` : ''}</Text>
                    <View style={styles.modalItemDetails}>
                      <Text style={styles.modalItemPrice}>₺{(item.sale_price ?? 0).toFixed(2)} / {item.unit || 'adet'}</Text>
                      <Text style={styles.modalItemStock}>Stok: {item.stock_quantity ?? 0}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                style={styles.productList}
              />
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setProductPickerIndex(null)}>
              <Text style={styles.modalCloseText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="Bakım Raporu Oluştur"
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
      />

      <KeyboardAwareScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* Bakım Bilgileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bakım Bilgileri</Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoLabel}>Bina: </Text>
            {maintenanceSchedule.building?.name}
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoLabel}>Adres: </Text>
            {maintenanceSchedule.building?.address}
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.infoLabel}>Bakım Türü: </Text>
            {maintenanceSchedule.maintenance_type_label}
          </Text>
        </View>

        {/* Çalışma Saatleri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Çalışma Saatleri</Text>
          <View style={styles.timeRow}>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Ionicons name="time-outline" size={20} color={COLORS.primary[600]} />
              <Text style={styles.timeButtonText}>
                Başlangıç: {formatTime(startTime)}
              </Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                is24Hour={true}
                display="default"
                locale="tr-TR"
                onChange={(event, selectedDate) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    const today = new Date();
                    today.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
                    setStartTime(today);
                  }
                }}
              />
            )}
          </View>
          <View style={styles.timeRow}>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Ionicons name="time-outline" size={20} color={COLORS.gray[600]} />
              <Text style={[styles.timeButtonText, !endTime && styles.timeButtonTextPlaceholder]}>
                Bitiş: {endTime ? formatTime(endTime) : 'Seçiniz (Opsiyonel)'}
              </Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={endTime || startTime}
                mode="time"
                is24Hour={true}
                display="default"
                locale="tr-TR"
                onChange={(event, selectedDate) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    const today = new Date();
                    today.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
                    setEndTime(today);
                  }
                }}
              />
            )}
          </View>
        </View>

        {/* Yapılan İşler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yapılan İşler *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Yapılan işleri detaylı bir şekilde açıklayın..."
            multiline
            numberOfLines={5}
            value={workDescription}
            onChangeText={setWorkDescription}
            textAlignVertical="top"
          />
        </View>

        {/* Kullanılan Ürünler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kullanılan Ürünler</Text>
          {usedProducts.map((product, index) => renderProductRow(product, index))}
          <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary[600]} />
            <Text style={styles.addButtonText}>Ürün Ekle</Text>
          </TouchableOpacity>
          <View style={styles.totalCostContainer}>
            <Text style={styles.totalCostLabel}>Toplam Maliyet:</Text>
            <Text style={styles.totalCostValue}>₺{calculateTotalCost().toFixed(2)}</Text>
          </View>
        </View>

        {/* Sorunlar ve Öneriler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sorunlar ve Öneriler</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Tespit ettiğiniz sorunları yazın..."
            multiline
            numberOfLines={4}
            value={problemsFound}
            onChangeText={setProblemsFound}
            textAlignVertical="top"
          />
          <View style={styles.spacer} />
          <TextInput
            style={styles.textArea}
            placeholder="Gelecek için önerilerinizi yazın..."
            multiline
            numberOfLines={4}
            value={recommendations}
            onChangeText={setRecommendations}
            textAlignVertical="top"
          />
        </View>

        {/* Tamamlanma Durumu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tamamlanma Durumu *</Text>
          <View style={styles.statusContainer}>
            {(['tamamlandi', 'kismi_tamamlandi', 'ertelendi'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusButton,
                  completionStatus === status && styles.statusButtonActive,
                ]}
                onPress={() => {
                  hapticFeedback.light();
                  setCompletionStatus(status);
                }}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    completionStatus === status && styles.statusButtonTextActive,
                  ]}
                >
                  {status === 'tamamlandi' && '✅ Tamamlandı'}
                  {status === 'kismi_tamamlandi' && '⏳ Kısmi Tamamlandı'}
                  {status === 'ertelendi' && '⏸️ Ertelendi'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Müşteri Onayı */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Müşteri Onayı</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Müşteri onayı alındı</Text>
            <Switch
              value={customerSignature}
              onValueChange={setCustomerSignature}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary[300] }}
              thumbColor={customerSignature ? COLORS.primary[500] : COLORS.gray[400]}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Onaylayan kişinin adı soyadı"
            value={customerName}
            onChangeText={setCustomerName}
          />
          <TextInput
            style={styles.textArea}
            placeholder="Müşterinin belirttiği notlar..."
            multiline
            numberOfLines={3}
            value={customerNotes}
            onChangeText={setCustomerNotes}
            textAlignVertical="top"
          />
        </View>

        {/* Fotoğraflar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fotoğraflar</Text>
          {renderPhotoGrid()}
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoButton} onPress={handlePickImages}>
              <Ionicons name="images-outline" size={20} color={COLORS.primary[600]} />
              <Text style={styles.photoButtonText}>Galeriden Seç</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
              <Ionicons name="camera-outline" size={20} color={COLORS.primary[600]} />
              <Text style={styles.photoButtonText}>Fotoğraf Çek</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Buttons */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitButton, styles.submitButtonDraft]}
            onPress={() => handleSubmit('draft')}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.gray[700]} />
            ) : (
              <>
                <Text style={styles.submitButtonTextDraft}>📝 Taslak Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, styles.submitButtonComplete]}
            onPress={() => handleSubmit('complete')}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Text style={styles.submitButtonTextComplete}>✅ Raporu Tamamla</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 12,
  },
  infoText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  timeRow: {
    marginBottom: 12,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    gap: 8,
  },
  timeButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
  },
  timeButtonTextPlaceholder: {
    color: COLORS.gray[500],
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    padding: 12,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
    backgroundColor: 'white',
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    padding: 12,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
    backgroundColor: 'white',
    minHeight: 100,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  productContent: {
    flex: 1,
  },
  productInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    padding: 12,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
    backgroundColor: 'white',
    marginBottom: 8,
  },
  productInputSmall: {
    flex: 1,
  },
  productRowBottom: {
    flexDirection: 'row',
    gap: 8,
  },
  productSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  productSelectText: { fontSize: 14, color: COLORS.gray[900] },
  productSelectPlaceholder: { color: COLORS.gray[500] },
  unitPriceReadonly: { backgroundColor: COLORS.gray[50], color: COLORS.gray[700] },
  removeButton: {
    padding: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  modalItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  modalItemName: { fontSize: 15, color: COLORS.gray[900], fontWeight: '500' },
  modalItemDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  modalItemPrice: { fontSize: 12, color: COLORS.primary[600], fontWeight: '600' },
  modalItemStock: { fontSize: 12, color: COLORS.gray[500] },
  modalClose: { padding: 16, alignItems: 'center', marginTop: 8 },
  modalCloseText: { fontSize: 16, color: COLORS.primary[600], fontWeight: '600' },
  productList: { maxHeight: 400 },
  emptyProductList: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyProductText: { fontSize: 15, color: COLORS.gray[700], marginTop: 12, fontWeight: '500' },
  emptyProductSubtext: { fontSize: 13, color: COLORS.gray[500], marginTop: 4 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primary[300],
    borderStyle: 'dashed',
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[600],
    fontWeight: '600',
  },
  totalCostContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  totalCostLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  totalCostValue: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.primary[600],
  },
  spacer: {
    height: 12,
  },
  statusContainer: {
    gap: 8,
  },
  statusButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    backgroundColor: 'white',
  },
  statusButtonActive: {
    borderColor: COLORS.primary[500],
    backgroundColor: COLORS.primary[50],
  },
  statusButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[700],
  },
  statusButtonTextActive: {
    color: COLORS.primary[700],
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  photoItem: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primary[300],
    borderRadius: 8,
    gap: 8,
  },
  photoButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[600],
    fontWeight: '600',
  },
  submitContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDraft: {
    backgroundColor: COLORS.warning[100],
  },
  submitButtonComplete: {
    backgroundColor: COLORS.primary[600],
  },
  submitButtonTextDraft: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: 'bold',
    color: COLORS.gray[700],
  },
  submitButtonTextComplete: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default CreateMaintenanceReportScreen;
