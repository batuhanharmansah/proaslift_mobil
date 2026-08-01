// 💰 PAYABLES SCREEN
// Borçlar Yönetim Ekranı - Liste, ekleme, ödeme yapma
// SADECE ADMIN KULLANICILAR İÇİN

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { useAuth } from '../../store/authStore';
import { apiClient } from '../../services/api/client';
import { API_ENDPOINTS } from '../../constants';
import { COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback, formatCurrency } from '../../utils';
import DatePickerField from '../../components/ui/DatePickerField';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import { formatDate } from '../../utils/dateUtils';
import { Payable, AccountType } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PayablesScreen: React.FC = () => {
  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();
  const { isEmployee } = useAuth();

  // ==================== STATE ====================
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    total_amount: '',
    category: 'elektrik' as 'elektrik' | 'su' | 'dogalgaz' | 'internet' | 'telefon' | 'maas' | 'vergi' | 'sigorta' | 'kira' | 'diger',
    due_date: new Date().toISOString().split('T')[0],
    priority: 'orta' as 'dusuk' | 'orta' | 'yuksek',
    invoice_number: '',
    supplier_name: '',
    notes: '',
  });

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    account_id: '',
  });

  // Pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
  });

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (isEmployee) {
      Alert.alert('Yetkisiz Erişim', 'Bu sayfaya sadece admin kullanıcıları erişebilir.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    fetchData();
  }, [isEmployee, navigation]);

  useEffect(() => {
    fetchPayables();
  }, [filters, pagination.current_page]);

  // ==================== FUNCTIONS ====================
  const fetchData = useCallback(async () => {
    try {
      const accountsRes = await apiClient.get(API_ENDPOINTS.FINANCIAL_ACCOUNTS);
      // API client returns response.data, so response is already { success: true, data: [...] }
      if (accountsRes?.success && accountsRes?.data) {
        setAccounts(Array.isArray(accountsRes.data) ? accountsRes.data : []);
      } else if (Array.isArray(accountsRes)) {
        setAccounts(accountsRes);
      } else if (Array.isArray(accountsRes?.data)) {
        setAccounts(accountsRes.data);
      }

      await fetchPayables();
    } catch (error: any) {
      console.error('Fetch data error:', error);
      Alert.alert('Hata', 'Veriler yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
    }
  }, []);

  const fetchPayables = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      params.append('page', pagination.current_page.toString());
      params.append('per_page', pagination.per_page.toString());

      const response = await apiClient.get(`${API_ENDPOINTS.FINANCIAL_PAYABLES}?${params.toString()}`);

      // API client returns response.data, so response is already { success: true, data: {...} }
      if (response?.success && response?.data) {
        const payablesData = response.data;
        // Check if data is paginated (has data property) or direct array
        const payablesList = payablesData?.data || payablesData;
        
        if (Array.isArray(payablesList)) {
          if (pagination.current_page === 1) {
            setPayables(payablesList);
          } else {
            setPayables((prev) => [...prev, ...payablesList]);
          }
        }
        
        // Update pagination if available
        if (payablesData?.current_page) {
          setPagination({
            current_page: payablesData.current_page,
            last_page: payablesData.last_page || 1,
            per_page: payablesData.per_page || 20,
          });
        }
      } else if (Array.isArray(response)) {
        // Direct array response
        if (pagination.current_page === 1) {
          setPayables(response);
        } else {
          setPayables((prev) => [...prev, ...response]);
        }
      } else if (Array.isArray(response?.data)) {
        // response.data is array
        if (pagination.current_page === 1) {
          setPayables(response.data);
        } else {
          setPayables((prev) => [...prev, ...response.data]);
        }
      }
    } catch (error: any) {
      console.error('Fetch payables error:', error);
      Alert.alert('Hata', 'Borçlar yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.current_page, pagination.per_page]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPagination({ ...pagination, current_page: 1 });
    await hapticFeedback.light();
    await fetchPayables();
    setRefreshing(false);
  }, [fetchPayables, pagination]);

  const handleLoadMore = useCallback(() => {
    if (!loading && pagination.current_page < pagination.last_page) {
      setPagination({ ...pagination, current_page: pagination.current_page + 1 });
    }
  }, [loading, pagination]);

  const handleAddPayable = useCallback(async () => {
    if (!formData.title.trim() || !formData.total_amount) {
      Alert.alert('Eksik Bilgi', 'Lütfen başlık ve tutar girin.');
      return;
    }

    try {
      setLoading(true);
      await hapticFeedback.medium();

      const response = await apiClient.post<{ success: boolean; message: string }>(
        API_ENDPOINTS.FINANCIAL_PAYABLES,
        {
          title: formData.title.trim(),
          description: formData.description || null,
          total_amount: parseFloat(formData.total_amount),
          category: formData.category,
          due_date: formData.due_date,
          priority: formData.priority,
          invoice_number: formData.invoice_number || null,
          supplier_name: formData.supplier_name || null,
          notes: formData.notes || null,
        }
      );

      if (response?.success) {
        Alert.alert('Başarılı', response?.message || 'Borç oluşturuldu');
        setShowAddModal(false);
        resetForm();
        setPagination({ ...pagination, current_page: 1 });
        await fetchPayables();
      }
    } catch (error: any) {
      console.error('Add payable error:', error);
      Alert.alert('Hata', error.response?.data?.message || 'Borç oluşturulamadı');
    } finally {
      setLoading(false);
    }
  }, [formData, fetchPayables, pagination]);

  const handleMakePayment = useCallback(async () => {
    if (!paymentForm.amount || !paymentForm.account_id || !selectedPayable) {
      Alert.alert('Eksik Bilgi', 'Lütfen ödeme tutarı ve hesap seçin.');
      return;
    }

    const paymentAmount = parseFloat(paymentForm.amount);
    if (paymentAmount > (selectedPayable.remaining_amount || 0)) {
      Alert.alert('Hata', 'Ödeme tutarı kalan tutardan fazla olamaz.');
      return;
    }

    try {
      setLoading(true);
      await hapticFeedback.medium();

      const response = await apiClient.post<{ success: boolean; message: string }>(
        API_ENDPOINTS.FINANCIAL_MAKE_PAYMENT,
        {
          payable_id: selectedPayable.id,
          amount: paymentAmount,
          account_id: parseInt(paymentForm.account_id),
        }
      );

      if (response?.success) {
        Alert.alert('Başarılı', response?.message || 'Ödeme kaydedildi');
        setShowPaymentModal(false);
        setSelectedPayable(null);
        setPaymentForm({ amount: '', account_id: '' });
        setPagination({ ...pagination, current_page: 1 });
        await fetchPayables();
      }
    } catch (error: any) {
      console.error('Make payment error:', error);
      Alert.alert('Hata', error.response?.data?.message || 'Ödeme kaydedilemedi');
    } finally {
      setLoading(false);
    }
  }, [paymentForm, selectedPayable, fetchPayables, pagination]);

  const handleDeletePayable = useCallback((payable: Payable) => {
    Alert.alert(
      'Borcu Sil',
      `${payable.title} borcunu silmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await hapticFeedback.medium();

              const response = await apiClient.delete<{ success: boolean; message: string }>(
                `${API_ENDPOINTS.FINANCIAL_PAYABLES}/${payable.id}`
              );

              if (response?.success) {
                Alert.alert('Başarılı', response?.message || 'Borç silindi');
                setPagination({ ...pagination, current_page: 1 });
                await fetchPayables();
              }
            } catch (error: any) {
              console.error('Delete payable error:', error);
              Alert.alert('Hata', error.response?.data?.message || 'Borç silinemedi');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [fetchPayables, pagination]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      total_amount: '',
      category: 'elektrik',
      due_date: new Date().toISOString().split('T')[0],
      priority: 'orta',
      invoice_number: '',
      supplier_name: '',
      notes: '',
    });
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      category: '',
      search: '',
    });
    setPagination({ ...pagination, current_page: 1 });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'tamamlandi':
        return COLORS.success[600];
      case 'kismi_odendi':
        return COLORS.warning[600];
      case 'gecikti':
        return COLORS.error[600];
      default:
        return COLORS.gray[600];
    }
  };

  // ==================== RENDER ====================
  if (isEmployee) {
    return null;
  }

  if (loading && payables.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderPayableItem = ({ item }: { item: Payable }) => (
    <TouchableOpacity style={styles.receivableCard}>
      <View style={styles.receivableHeader}>
        <View style={styles.receivableInfo}>
          <Text style={styles.receivableTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.receivableMeta}>
            <Text style={styles.receivableDate}>
              {formatDate(item.due_date, 'short')}
            </Text>
            <Text style={styles.receivableBuilding}>• {item.category_label}</Text>
          </View>
        </View>
        <View style={styles.receivableAmountContainer}>
          <Text style={styles.receivableAmount}>{formatCurrency(item.total_amount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status_label}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.receivableProgress}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(item.paid_amount / item.total_amount) * 100}%`,
                backgroundColor: item.status === 'tamamlandi' ? COLORS.success[500] : COLORS.error[500],
              },
            ]}
          />
        </View>
        <View style={styles.progressText}>
          <Text style={styles.progressLabel}>Ödenen</Text>
          <Text style={styles.progressValue}>
            {formatCurrency(item.paid_amount)} / {formatCurrency(item.total_amount)}
          </Text>
        </View>
        <Text style={styles.remainingAmount}>
          Kalan: {formatCurrency(item.remaining_amount)}
        </Text>
      </View>

      {item.remaining_amount > 0 && (
        <View style={styles.receivableActions}>
          <TouchableOpacity
            style={styles.paymentButton}
            onPress={() => {
              setSelectedPayable(item);
              setPaymentForm({
                amount: item.remaining_amount.toString(),
                account_id: '',
              });
              setShowPaymentModal(true);
            }}
          >
            <Ionicons name="cash-outline" size={18} color={COLORS.error[600]} />
            <Text style={[styles.paymentButtonText, { color: COLORS.error[600] }]}>Ödeme Yap</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeletePayable(item)}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.error[600]} />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="Borçlar"
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
        rightElement={
          <TouchableOpacity
            onPress={() => { resetForm(); setShowAddModal(true); }}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        }
      />

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filtersRow}>
            {(['beklemede', 'kismi_odendi', 'tamamlandi', 'gecikti'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, filters.status === status && styles.filterChipActive]}
                onPress={() =>
                  setFilters({ ...filters, status: filters.status === status ? '' : status })
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filters.status === status && styles.filterChipTextActive,
                  ]}
                >
                  {status === 'beklemede'
                    ? 'Beklemede'
                    : status === 'kismi_odendi'
                    ? 'Kısmi'
                    : status === 'tamamlandi'
                    ? 'Tamamlandı'
                    : 'Gecikti'}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.filterChip} onPress={clearFilters}>
              <Ionicons name="close-circle" size={16} color={COLORS.gray[600]} />
              <Text style={styles.filterChipText}>Temizle</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.gray[400]} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Borç ara..."
          value={filters.search}
          onChangeText={(text) => setFilters({ ...filters, search: text })}
        />
        {filters.search ? (
          <TouchableOpacity onPress={() => setFilters({ ...filters, search: '' })}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* List */}
      <FlatList
        data={payables}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        renderItem={renderPayableItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary[500]} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="arrow-up-circle-outline" size={64} color={COLORS.gray[400]} />
            <Text style={styles.emptyText}>Henüz borç bulunmuyor</Text>
            <Text style={styles.emptySubtext}>Yeni borç eklemek için + butonuna tıklayın</Text>
          </View>
        }
        ListFooterComponent={
          loading && payables.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={COLORS.primary[500]} />
            </View>
          ) : null
        }
        // Performance optimizations
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: 180, // Approximate item height (with progress bar)
          offset: 180 * index,
          index,
        })}
      />

      {/* Add Receivable Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Yeni Borç Ekle</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.gray[600]} />
                </TouchableOpacity>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Başlık *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Borç başlığı"
                    value={formData.title}
                    onChangeText={(text) => setFormData({ ...formData, title: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Kategori *</Text>
                  <View style={styles.typeButtons}>
                    {(['elektrik', 'su', 'dogalgaz', 'internet', 'telefon', 'maas', 'vergi', 'sigorta', 'kira', 'diger'] as const).map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.typeButton,
                          formData.category === cat && styles.typeButtonActive,
                        ]}
                        onPress={() => setFormData({ ...formData, category: cat })}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            formData.category === cat && styles.typeButtonTextActive,
                          ]}
                        >
                          {cat === 'elektrik' ? 'Elektrik' : cat === 'su' ? 'Su' : cat === 'dogalgaz' ? 'Doğalgaz' : cat === 'internet' ? 'İnternet' : cat === 'telefon' ? 'Telefon' : cat === 'maas' ? 'Maaş' : cat === 'vergi' ? 'Vergi' : cat === 'sigorta' ? 'Sigorta' : cat === 'kira' ? 'Kira' : 'Diğer'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Toplam Tutar *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={formData.total_amount}
                    onChangeText={(text) => setFormData({ ...formData, total_amount: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <DatePickerField
                    label="Vade Tarihi *"
                    value={formData.due_date}
                    onChange={(v) => setFormData({ ...formData, due_date: v })}
                    placeholder="Tarih seçin"
                    style={{ marginBottom: 0 }}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Öncelik</Text>
                  <View style={styles.typeButtons}>
                    {(['dusuk', 'orta', 'yuksek'] as const).map((priority) => (
                      <TouchableOpacity
                        key={priority}
                        style={[
                          styles.typeButton,
                          formData.priority === priority && styles.typeButtonActive,
                        ]}
                        onPress={() => setFormData({ ...formData, priority })}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            formData.priority === priority && styles.typeButtonTextActive,
                          ]}
                        >
                          {priority === 'dusuk' ? 'Düşük' : priority === 'orta' ? 'Orta' : 'Yüksek'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Fatura Numarası</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Fatura no (opsiyonel)"
                    value={formData.invoice_number}
                    onChangeText={(text) => setFormData({ ...formData, invoice_number: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Tedarikçi Adı</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Tedarikçi adı (opsiyonel)"
                    value={formData.supplier_name}
                    onChangeText={(text) => setFormData({ ...formData, supplier_name: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Açıklama</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Açıklama (opsiyonel)"
                    multiline
                    numberOfLines={3}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Notlar</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Notlar (opsiyonel)"
                    multiline
                    numberOfLines={3}
                    value={formData.notes}
                    onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddPayable}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receive Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ödeme Yap</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </TouchableOpacity>
            </View>

            {selectedPayable && (
              <View style={styles.formContainer}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentInfoLabel}>Borç:</Text>
                  <Text style={styles.paymentInfoValue}>{selectedPayable.title}</Text>
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentInfoLabel}>Kalan Tutar:</Text>
                  <Text style={[styles.paymentInfoValue, styles.paymentInfoAmount]}>
                    {formatCurrency(selectedPayable.remaining_amount)}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Ödeme Tutarı *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={paymentForm.amount}
                    onChangeText={(text) => setPaymentForm({ ...paymentForm, amount: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Hesap *</Text>
                  <View style={styles.selectContainer}>
                    <Text style={styles.selectValue}>
                      {accounts.find((a) => a.id.toString() === paymentForm.account_id)?.name ||
                        'Hesap Seçin'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.gray[600]} />
                  </View>
                  <ScrollView style={styles.optionsList} nestedScrollEnabled>
                    {accounts.map((account) => (
                      <TouchableOpacity
                        key={account.id}
                        style={styles.optionItem}
                        onPress={() =>
                          setPaymentForm({ ...paymentForm, account_id: account.id.toString() })
                        }
                      >
                        <Text
                          style={[
                            styles.optionText,
                            paymentForm.account_id === account.id.toString() && styles.optionTextActive,
                          ]}
                        >
                          {account.name}
                        </Text>
                        {paymentForm.account_id === account.id.toString() && (
                          <Ionicons name="checkmark" size={20} color={COLORS.primary[600]} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPaymentModal(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleMakePayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Ödeme Yap</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  filtersContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    paddingVertical: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.gray[100],
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  filterChipActive: {
    backgroundColor: COLORS.primary[50],
    borderColor: COLORS.primary[600],
  },
  filterChipText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[700],
  },
  filterChipTextActive: {
    color: COLORS.primary[600],
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  receivableCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  receivableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receivableInfo: {
    flex: 1,
  },
  receivableTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  receivableMeta: {
    flexDirection: 'row',
    marginTop: 4,
  },
  receivableDate: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
  },
  receivableBuilding: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
  },
  receivableAmountContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  receivableAmount: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.warning[600],
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
  },
  receivableProgress: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
  },
  progressValue: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  remainingAmount: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.error[600],
  },
  receivableActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  paymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: COLORS.success[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.success[300],
  },
  paymentButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.success[600],
  },
  deleteButton: {
    padding: 10,
    backgroundColor: COLORS.error[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error[300],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginTop: 8,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  modalTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  formContainer: {
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  selectValue: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
  },
  optionsList: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: 'white',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  optionText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
  },
  optionTextActive: {
    color: COLORS.primary[600],
    fontWeight: '600',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: 'white',
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: COLORS.primary[600],
    backgroundColor: COLORS.primary[50],
  },
  typeButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: COLORS.primary[600],
    fontWeight: '600',
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentInfoLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  paymentInfoValue: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  paymentInfoAmount: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.warning[600],
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.gray[100],
  },
  cancelButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  saveButton: {
    backgroundColor: COLORS.success[600],
  },
  saveButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: 'white',
  },
});

export default PayablesScreen;
