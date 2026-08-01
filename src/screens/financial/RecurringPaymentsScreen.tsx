// 💰 RECURRING PAYMENTS SCREEN
// Düzenli Ödemeler Yönetim Ekranı - Liste, ekleme, düzenleme, silme
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
  Switch,
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
import { RecurringPayment, AccountType, Building } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RecurringPaymentsScreen: React.FC = () => {
  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();
  const { isEmployee } = useAuth();

  // ==================== STATE ====================
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    type: '',
    frequency: '',
    is_active: '',
    search: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    type: 'gider' as 'gelir' | 'gider',
    frequency: 'aylik' as 'gunluk' | 'haftalik' | 'aylik' | 'uc_aylik' | 'alti_aylik' | 'yillik',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    building_id: '',
    account_id: '',
    is_active: true,
    notes: '',
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
    fetchRecurringPayments();
  }, [filters, pagination.current_page]);

  // ==================== FUNCTIONS ====================
  const fetchData = useCallback(async () => {
    try {
      const [accountsRes, buildingsRes] = await Promise.all([
        apiClient.get(API_ENDPOINTS.FINANCIAL_ACCOUNTS),
        apiClient.get(API_ENDPOINTS.BUILDINGS),
      ]);

      // API client returns response.data, so response is already { success: true, data: [...] }
      if (accountsRes?.success && accountsRes?.data) {
        setAccounts(Array.isArray(accountsRes.data) ? accountsRes.data : []);
      } else if (Array.isArray(accountsRes)) {
        setAccounts(accountsRes);
      } else if (Array.isArray(accountsRes?.data)) {
        setAccounts(accountsRes.data);
      }

      if (buildingsRes?.success && buildingsRes?.data) {
        setBuildings(Array.isArray(buildingsRes.data) ? buildingsRes.data : []);
      } else if (Array.isArray(buildingsRes)) {
        setBuildings(buildingsRes);
      } else if (Array.isArray(buildingsRes?.data)) {
        setBuildings(buildingsRes.data);
      }

      await fetchRecurringPayments();
    } catch (error: any) {
      console.error('Fetch data error:', error);
      Alert.alert('Hata', 'Veriler yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
    }
  }, []);

  const fetchRecurringPayments = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.frequency) params.append('frequency', filters.frequency);
      if (filters.is_active !== '') params.append('is_active', filters.is_active);
      if (filters.search) params.append('search', filters.search);
      params.append('page', pagination.current_page.toString());
      params.append('per_page', pagination.per_page.toString());

      const response = await apiClient.get(`${API_ENDPOINTS.FINANCIAL_RECURRING_PAYMENTS}?${params.toString()}`);

      // API client returns response.data, so response is already { success: true, data: {...} }
      if (response?.success && response?.data) {
        const paymentsData = response.data;
        // Check if data is paginated (has data property) or direct array
        const paymentsList = paymentsData?.data || paymentsData;
        
        if (Array.isArray(paymentsList)) {
          if (pagination.current_page === 1) {
            setRecurringPayments(paymentsList);
          } else {
            setRecurringPayments((prev) => [...prev, ...paymentsList]);
          }
        }
        
        // Update pagination if available
        if (paymentsData?.current_page) {
          setPagination({
            current_page: paymentsData.current_page,
            last_page: paymentsData.last_page || 1,
            per_page: paymentsData.per_page || 20,
          });
        }
      } else if (Array.isArray(response)) {
        // Direct array response
        if (pagination.current_page === 1) {
          setRecurringPayments(response);
        } else {
          setRecurringPayments((prev) => [...prev, ...response]);
        }
      } else if (Array.isArray(response?.data)) {
        // response.data is array
        if (pagination.current_page === 1) {
          setRecurringPayments(response.data);
        } else {
          setRecurringPayments((prev) => [...prev, ...response.data]);
        }
      }
    } catch (error: any) {
      console.error('Fetch recurring payments error:', error);
      Alert.alert('Hata', 'Düzenli ödemeler yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.current_page, pagination.per_page]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPagination({ ...pagination, current_page: 1 });
    await hapticFeedback.light();
    await fetchRecurringPayments();
    setRefreshing(false);
  }, [fetchRecurringPayments, pagination]);

  const handleLoadMore = useCallback(() => {
    if (!loading && pagination.current_page < pagination.last_page) {
      setPagination({ ...pagination, current_page: pagination.current_page + 1 });
    }
  }, [loading, pagination]);

  const handleAddRecurringPayment = useCallback(async () => {
    if (!formData.title.trim() || !formData.amount) {
      Alert.alert('Eksik Bilgi', 'Lütfen başlık ve tutar girin.');
      return;
    }

    try {
      setLoading(true);
      await hapticFeedback.medium();

      const response = await apiClient.post<{ success: boolean; message: string }>(
        API_ENDPOINTS.FINANCIAL_RECURRING_PAYMENTS,
        {
          title: formData.title.trim(),
          description: formData.description || null,
          amount: parseFloat(formData.amount),
          type: formData.type,
          frequency: formData.frequency,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          building_id: formData.building_id ? parseInt(formData.building_id) : null,
          account_id: formData.account_id ? parseInt(formData.account_id) : null,
          is_active: formData.is_active,
          notes: formData.notes || null,
        }
      );

      if (response?.success) {
        Alert.alert('Başarılı', response?.message || 'Düzenli ödeme oluşturuldu');
        setShowAddModal(false);
        resetForm();
        setPagination({ ...pagination, current_page: 1 });
        await fetchRecurringPayments();
      }
    } catch (error: any) {
      console.error('Add recurring payment error:', error);
      Alert.alert('Hata', error.response?.data?.message || 'Düzenli ödeme oluşturulamadı');
    } finally {
      setLoading(false);
    }
  }, [formData, fetchRecurringPayments, pagination]);

  const handleDeleteRecurringPayment = useCallback((payment: RecurringPayment) => {
    Alert.alert(
      'Düzenli Ödemeyi Sil',
      `${payment.title} düzenli ödemesini silmek istediğinizden emin misiniz?`,
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
                `${API_ENDPOINTS.FINANCIAL_RECURRING_PAYMENTS}/${payment.id}`
              );

              if (response?.success) {
                Alert.alert('Başarılı', response?.message || 'Düzenli ödeme silindi');
                setPagination({ ...pagination, current_page: 1 });
                await fetchRecurringPayments();
              }
            } catch (error: any) {
              console.error('Delete recurring payment error:', error);
              Alert.alert('Hata', error.response?.data?.message || 'Düzenli ödeme silinemedi');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [fetchRecurringPayments, pagination]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: '',
      type: 'gider',
      frequency: 'aylik',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      building_id: '',
      account_id: '',
      is_active: true,
      notes: '',
    });
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      frequency: '',
      is_active: '',
      search: '',
    });
    setPagination({ ...pagination, current_page: 1 });
  };

  // ==================== RENDER ====================
  if (isEmployee) {
    return null;
  }

  if (loading && recurringPayments.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderRecurringPaymentItem = ({ item }: { item: RecurringPayment }) => (
    <TouchableOpacity style={styles.receivableCard}>
      <View style={styles.receivableHeader}>
        <View style={styles.receivableInfo}>
          <Text style={styles.receivableTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.receivableMeta}>
            <Text style={styles.receivableDate}>
              {item.frequency_label}
            </Text>
            <Text style={styles.receivableBuilding}>• {item.type_label}</Text>
          </View>
        </View>
        <View style={styles.receivableAmountContainer}>
          <Text style={[styles.receivableAmount, item.type === 'gelir' ? styles.positive : styles.negative]}>
            {item.type === 'gelir' ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: item.is_active ? COLORS.success[50] : COLORS.gray[200] }]}>
            <Text style={[styles.statusText, { color: item.is_active ? COLORS.success[600] : COLORS.gray[600] }]}>
              {item.is_active ? 'Aktif' : 'Pasif'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.receivableProgress}>
        {item.next_payment_date && (
          <View style={styles.nextPaymentInfo}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.gray[600]} />
            <Text style={styles.nextPaymentText}>
              Sonraki Ödeme: {formatDate(item.next_payment_date, 'short')}
            </Text>
          </View>
        )}
        {item.last_payment_date && (
          <View style={styles.nextPaymentInfo}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.success[600]} />
            <Text style={styles.nextPaymentText}>
              Son Ödeme: {formatDate(item.last_payment_date, 'short')}
            </Text>
          </View>
        )}
        {item.building && (
          <View style={styles.nextPaymentInfo}>
            <Ionicons name="business-outline" size={16} color={COLORS.gray[600]} />
            <Text style={styles.nextPaymentText}>{item.building.name}</Text>
          </View>
        )}
      </View>

      <View style={styles.receivableActions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteRecurringPayment(item)}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error[600]} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="Düzenli Ödemeler"
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
            {(['gelir', 'gider'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.filterChip, filters.type === type && styles.filterChipActive]}
                onPress={() =>
                  setFilters({ ...filters, type: filters.type === type ? '' : type })
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filters.type === type && styles.filterChipTextActive,
                  ]}
                >
                  {type === 'gelir' ? 'Gelir' : 'Gider'}
                </Text>
              </TouchableOpacity>
            ))}
            {(['aktif', 'pasif'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChip, filters.is_active === status && styles.filterChipActive]}
                onPress={() =>
                  setFilters({ ...filters, is_active: filters.is_active === status ? '' : status })
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filters.is_active === status && styles.filterChipTextActive,
                  ]}
                >
                  {status === 'aktif' ? 'Aktif' : 'Pasif'}
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
          placeholder="Düzenli ödeme ara..."
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
        data={recurringPayments}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        renderItem={renderRecurringPaymentItem}
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
            <Ionicons name="repeat-outline" size={64} color={COLORS.gray[400]} />
            <Text style={styles.emptyText}>Henüz düzenli ödeme bulunmuyor</Text>
            <Text style={styles.emptySubtext}>Yeni düzenli ödeme eklemek için + butonuna tıklayın</Text>
          </View>
        }
        ListFooterComponent={
          loading && recurringPayments.length > 0 ? (
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
          length: 140, // Approximate item height
          offset: 140 * index,
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
                <Text style={styles.modalTitle}>Yeni Düzenli Ödeme Ekle</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.gray[600]} />
                </TouchableOpacity>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Başlık *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Düzenli ödeme başlığı"
                    value={formData.title}
                    onChangeText={(text) => setFormData({ ...formData, title: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Tür *</Text>
                  <View style={styles.typeButtons}>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        formData.type === 'gelir' && styles.typeButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, type: 'gelir' })}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          formData.type === 'gelir' && styles.typeButtonTextActive,
                        ]}
                      >
                        Gelir
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        formData.type === 'gider' && styles.typeButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, type: 'gider' })}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          formData.type === 'gider' && styles.typeButtonTextActive,
                        ]}
                      >
                        Gider
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Tutar *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={formData.amount}
                    onChangeText={(text) => setFormData({ ...formData, amount: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Sıklık *</Text>
                  <View style={styles.typeButtons}>
                    {(['gunluk', 'haftalik', 'aylik', 'uc_aylik', 'alti_aylik', 'yillik'] as const).map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        style={[
                          styles.typeButton,
                          formData.frequency === freq && styles.typeButtonActive,
                        ]}
                        onPress={() => setFormData({ ...formData, frequency: freq })}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            formData.frequency === freq && styles.typeButtonTextActive,
                          ]}
                        >
                          {freq === 'gunluk' ? 'Günlük' : freq === 'haftalik' ? 'Haftalık' : freq === 'aylik' ? 'Aylık' : freq === 'uc_aylik' ? '3 Aylık' : freq === 'alti_aylik' ? '6 Aylık' : 'Yıllık'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <DatePickerField
                    label="Başlangıç Tarihi *"
                    value={formData.start_date}
                    onChange={(v) => setFormData({ ...formData, start_date: v })}
                    placeholder="Tarih seçin"
                    style={{ marginBottom: 0 }}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <DatePickerField
                    label="Bitiş Tarihi (Opsiyonel)"
                    value={formData.end_date}
                    onChange={(v) => setFormData({ ...formData, end_date: v })}
                    placeholder="Tarih seçin"
                    style={{ marginBottom: 0 }}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bina (Opsiyonel)</Text>
                  <View style={styles.selectContainer}>
                    <Text style={styles.selectValue}>
                      {buildings.find((b) => b.id.toString() === formData.building_id)?.name ||
                        'Bina Seçin (Opsiyonel)'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.gray[600]} />
                  </View>
                  <ScrollView style={styles.optionsList} nestedScrollEnabled>
                    <TouchableOpacity
                      style={styles.optionItem}
                      onPress={() => setFormData({ ...formData, building_id: '' })}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          !formData.building_id && styles.optionTextActive,
                        ]}
                      >
                        Bina Seçme
                      </Text>
                      {!formData.building_id && (
                        <Ionicons name="checkmark" size={20} color={COLORS.primary[600]} />
                      )}
                    </TouchableOpacity>
                    {buildings.map((building) => (
                      <TouchableOpacity
                        key={building.id}
                        style={styles.optionItem}
                        onPress={() =>
                          setFormData({ ...formData, building_id: building.id.toString() })
                        }
                      >
                        <Text
                          style={[
                            styles.optionText,
                            formData.building_id === building.id.toString() && styles.optionTextActive,
                          ]}
                        >
                          {building.name}
                        </Text>
                        {formData.building_id === building.id.toString() && (
                          <Ionicons name="checkmark" size={20} color={COLORS.primary[600]} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Hesap (Opsiyonel)</Text>
                  <View style={styles.selectContainer}>
                    <Text style={styles.selectValue}>
                      {accounts.find((a) => a.id.toString() === formData.account_id)?.name ||
                        'Hesap Seçin (Opsiyonel)'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.gray[600]} />
                  </View>
                  <ScrollView style={styles.optionsList} nestedScrollEnabled>
                    <TouchableOpacity
                      style={styles.optionItem}
                      onPress={() => setFormData({ ...formData, account_id: '' })}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          !formData.account_id && styles.optionTextActive,
                        ]}
                      >
                        Hesap Seçme
                      </Text>
                      {!formData.account_id && (
                        <Ionicons name="checkmark" size={20} color={COLORS.primary[600]} />
                      )}
                    </TouchableOpacity>
                    {accounts.map((account) => (
                      <TouchableOpacity
                        key={account.id}
                        style={styles.optionItem}
                        onPress={() =>
                          setFormData({ ...formData, account_id: account.id.toString() })
                        }
                      >
                        <Text
                          style={[
                            styles.optionText,
                            formData.account_id === account.id.toString() && styles.optionTextActive,
                          ]}
                        >
                          {account.name}
                        </Text>
                        {formData.account_id === account.id.toString() && (
                          <Ionicons name="checkmark" size={20} color={COLORS.primary[600]} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.switchContainer}>
                    <Text style={styles.label}>Aktif</Text>
                    <Switch
                      value={formData.is_active}
                      onValueChange={(value) => setFormData({ ...formData, is_active: value })}
                      trackColor={{ false: COLORS.gray[300], true: COLORS.primary[300] }}
                      thumbColor={formData.is_active ? COLORS.primary[600] : COLORS.gray[500]}
                    />
                  </View>
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
                onPress={handleAddRecurringPayment}
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
  nextPaymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  nextPaymentText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  positive: {
    color: COLORS.success[600],
  },
  negative: {
    color: COLORS.error[600],
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

export default RecurringPaymentsScreen;
