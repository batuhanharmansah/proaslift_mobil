// 💰 TRANSACTIONS SCREEN
// İşlemler Yönetim Ekranı - CRUD işlemleri, filtreleme, arama
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
import { formatDate } from '../../utils/dateUtils';
import DatePickerField from '../../components/ui/DatePickerField';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import { AccountingEntry, AccountType, Building } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TransactionsScreen: React.FC = () => {
  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();
  const { isEmployee } = useAuth();

  // ==================== STATE ====================
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<AccountingEntry[]>([]);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<AccountingEntry | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    status: '',
    account_id: '',
    building_id: '',
    date_from: '',
    date_to: '',
    search: '',
  });

  // Form state
  const [formData, setFormData] = useState({
    type: 'gelir' as 'gelir' | 'gider',
    category: 'genel',
    description: '',
    amount: '',
    account_id: '',
    building_id: '',
    payment_method: 'nakit' as 'nakit' | 'banka_havalesi' | 'kredi_karti' | 'cek',
    vat_rate: '20',
    transaction_date: new Date().toISOString().split('T')[0],
    invoice_number: '',
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
    fetchTransactions();
  }, [filters, pagination.current_page]);

  // ==================== FUNCTIONS ====================
  const fetchData = useCallback(async () => {
    try {
      // Fetch accounts and buildings for dropdowns
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

      await fetchTransactions();
    } catch (error: any) {
      console.error('Fetch data error:', error);
      Alert.alert('Hata', 'Veriler yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.account_id) params.append('account_type_id', filters.account_id);
      if (filters.building_id) params.append('building_id', filters.building_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.search) params.append('search', filters.search);
      params.append('page', pagination.current_page.toString());
      params.append('per_page', pagination.per_page.toString());

      const response = await apiClient.get(`${API_ENDPOINTS.FINANCIAL_TRANSACTIONS}?${params.toString()}`);

      // API client returns response.data, so response is already { success: true, data: {...} }
      if (response?.success && response?.data) {
        const transactionsData = response.data;
        // Check if data is paginated (has data property) or direct array
        const transactionsList = transactionsData?.data || transactionsData;
        
        if (Array.isArray(transactionsList)) {
          if (pagination.current_page === 1) {
            setTransactions(transactionsList);
          } else {
            setTransactions((prev) => [...prev, ...transactionsList]);
          }
        }
        
        // Update pagination if available
        if (transactionsData?.current_page) {
          setPagination({
            current_page: transactionsData.current_page,
            last_page: transactionsData.last_page || 1,
            per_page: transactionsData.per_page || 20,
          });
        }
      } else if (Array.isArray(response)) {
        // Direct array response
        if (pagination.current_page === 1) {
          setTransactions(response);
        } else {
          setTransactions((prev) => [...prev, ...response]);
        }
      } else if (Array.isArray(response?.data)) {
        // response.data is array
        if (pagination.current_page === 1) {
          setTransactions(response.data);
        } else {
          setTransactions((prev) => [...prev, ...response.data]);
        }
      }
    } catch (error: any) {
      console.error('Fetch transactions error:', error);
      Alert.alert('Hata', 'İşlemler yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.current_page, pagination.per_page]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPagination({ ...pagination, current_page: 1 });
    await hapticFeedback.light();
    await fetchTransactions();
    setRefreshing(false);
  }, [fetchTransactions, pagination]);

  const handleLoadMore = useCallback(() => {
    if (!loading && pagination.current_page < pagination.last_page) {
      setPagination({ ...pagination, current_page: pagination.current_page + 1 });
    }
  }, [loading, pagination]);

  const handleAddTransaction = useCallback(async () => {
    if (!formData.description.trim() || !formData.amount || !formData.account_id) {
      Alert.alert('Eksik Bilgi', 'Lütfen açıklama, tutar ve hesap seçin.');
      return;
    }

    try {
      setLoading(true);
      await hapticFeedback.medium();

      const response = await apiClient.post<{ success: boolean; message: string }>(
        API_ENDPOINTS.FINANCIAL_TRANSACTIONS,
        {
          type: formData.type,
          category: formData.category,
          description: formData.description.trim(),
          amount: parseFloat(formData.amount),
          account_id: parseInt(formData.account_id),
          building_id: formData.building_id ? parseInt(formData.building_id) : null,
          payment_method: formData.payment_method,
          vat_rate: formData.vat_rate ? parseFloat(formData.vat_rate) : null,
          transaction_date: formData.transaction_date,
          invoice_number: formData.invoice_number || null,
          notes: formData.notes || null,
        }
      );

      if (response?.success) {
        Alert.alert('Başarılı', response?.message || 'İşlem oluşturuldu');
        setShowAddModal(false);
        resetForm();
        setPagination({ ...pagination, current_page: 1 });
        await fetchTransactions();
      }
    } catch (error: any) {
      console.error('Add transaction error:', error);
      Alert.alert('Hata', error.response?.data?.message || 'İşlem oluşturulamadı');
    } finally {
      setLoading(false);
    }
  }, [formData, fetchTransactions, pagination]);

  const handleDeleteTransaction = useCallback((transaction: AccountingEntry) => {
    Alert.alert(
      'İşlemi Sil',
      `Bu işlemi silmek istediğinizden emin misiniz?`,
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
                `${API_ENDPOINTS.FINANCIAL_TRANSACTIONS}/${transaction.id}`
              );

              if (response?.success) {
                Alert.alert('Başarılı', response?.message || 'İşlem silindi');
                setPagination({ ...pagination, current_page: 1 });
                await fetchTransactions();
              }
            } catch (error: any) {
              console.error('Delete transaction error:', error);
              Alert.alert('Hata', error.response?.data?.message || 'İşlem silinemedi');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [fetchTransactions, pagination]);

  const resetForm = () => {
    setFormData({
      type: 'gelir',
      category: 'genel',
      description: '',
      amount: '',
      account_id: '',
      building_id: '',
      payment_method: 'nakit',
      vat_rate: '20',
      transaction_date: new Date().toISOString().split('T')[0],
      invoice_number: '',
      notes: '',
    });
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      category: '',
      status: '',
      account_id: '',
      building_id: '',
      date_from: '',
      date_to: '',
      search: '',
    });
    setPagination({ ...pagination, current_page: 1 });
  };

  // ==================== RENDER ====================
  if (isEmployee) {
    return null;
  }

  if (loading && transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderTransactionItem = ({ item }: { item: AccountingEntry }) => (
    <TouchableOpacity
      style={styles.transactionCard}
      onPress={() => {
        setSelectedTransaction(item);
        setShowEditModal(true);
      }}
    >
      <View style={styles.transactionHeader}>
        <View
          style={[
            styles.transactionIcon,
            item.type === 'gelir' ? styles.iconIncome : styles.iconExpense,
          ]}
        >
          <Ionicons
            name={item.type === 'gelir' ? 'arrow-down' : 'arrow-up'}
            size={20}
            color="white"
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription} numberOfLines={1}>
            {item.description}
          </Text>
          <View style={styles.transactionMeta}>
            <Text style={styles.transactionDate}>
              {formatDate(item.transaction_date, 'short')}
            </Text>
            {item.account_type && (
              <Text style={styles.transactionAccount}>• {item.account_type.name}</Text>
            )}
          </View>
        </View>
        <View style={styles.transactionAmountContainer}>
          <Text
            style={[
              styles.transactionAmount,
              item.type === 'gelir' ? styles.positive : styles.negative,
            ]}
          >
            {item.type === 'gelir' ? '+' : '-'}
            {formatCurrency(item.amount)}
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteTransaction(item);
            }}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.error[600]} />
          </TouchableOpacity>
        </View>
      </View>
      {item.building && (
        <View style={styles.transactionBuilding}>
          <Ionicons name="business-outline" size={14} color={COLORS.gray[600]} />
          <Text style={styles.transactionBuildingText}>{item.building.name}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="İşlemler"
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
        rightElement={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={styles.headerButton}
            >
              <Ionicons name="filter" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { resetForm(); setShowAddModal(true); }}
              style={styles.headerButton}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersRow}>
              <TouchableOpacity
                style={[styles.filterChip, filters.type === 'gelir' && styles.filterChipActive]}
                onPress={() =>
                  setFilters({ ...filters, type: filters.type === 'gelir' ? '' : 'gelir' })
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filters.type === 'gelir' && styles.filterChipTextActive,
                  ]}
                >
                  Gelir
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filters.type === 'gider' && styles.filterChipActive]}
                onPress={() =>
                  setFilters({ ...filters, type: filters.type === 'gider' ? '' : 'gider' })
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filters.type === 'gider' && styles.filterChipTextActive,
                  ]}
                >
                  Gider
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip} onPress={clearFilters}>
                <Ionicons name="close-circle" size={16} color={COLORS.gray[600]} />
                <Text style={styles.filterChipText}>Temizle</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.gray[400]} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="İşlem ara..."
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
        data={transactions}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        renderItem={renderTransactionItem}
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
            <Ionicons name="list-outline" size={64} color={COLORS.gray[400]} />
            <Text style={styles.emptyText}>Henüz işlem bulunmuyor</Text>
            <Text style={styles.emptySubtext}>Yeni işlem eklemek için + butonuna tıklayın</Text>
          </View>
        }
        ListFooterComponent={
          loading && transactions.length > 0 ? (
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
          length: 100, // Approximate item height
          offset: 100 * index,
          index,
        })}
      />

      {/* Add Transaction Modal */}
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
                <Text style={styles.modalTitle}>Yeni İşlem Ekle</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.gray[600]} />
                </TouchableOpacity>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>İşlem Türü *</Text>
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
                  <Text style={styles.label}>Açıklama *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="İşlem açıklaması"
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                  />
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
                  <Text style={styles.label}>Hesap *</Text>
                  <View style={styles.selectContainer}>
                    <Text style={styles.selectValue}>
                      {accounts.find((a) => a.id.toString() === formData.account_id)?.name ||
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
                  <Text style={styles.label}>Ödeme Yöntemi</Text>
                  <View style={styles.typeButtons}>
                    {(['nakit', 'banka_havalesi', 'kredi_karti', 'cek'] as const).map((method) => (
                      <TouchableOpacity
                        key={method}
                        style={[
                          styles.typeButton,
                          formData.payment_method === method && styles.typeButtonActive,
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, payment_method: method })
                        }
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            formData.payment_method === method && styles.typeButtonTextActive,
                          ]}
                        >
                          {method === 'nakit'
                            ? 'Nakit'
                            : method === 'banka_havalesi'
                            ? 'Havale'
                            : method === 'kredi_karti'
                            ? 'Kredi Kartı'
                            : 'Çek'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>KDV Oranı (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="20"
                    keyboardType="decimal-pad"
                    value={formData.vat_rate}
                    onChangeText={(text) => setFormData({ ...formData, vat_rate: text })}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <DatePickerField
                    label="İşlem Tarihi"
                    value={formData.transaction_date}
                    onChange={(v) => setFormData({ ...formData, transaction_date: v })}
                    placeholder="Tarih seçin"
                    style={{ marginBottom: 0 }}
                  />
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
                onPress={handleAddTransaction}
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
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
  transactionCard: {
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
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconIncome: {
    backgroundColor: COLORS.success[500],
  },
  iconExpense: {
    backgroundColor: COLORS.error[500],
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '500',
    color: COLORS.gray[900],
  },
  transactionMeta: {
    flexDirection: 'row',
    marginTop: 4,
  },
  transactionDate: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
  },
  transactionAccount: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  transactionAmount: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: 'bold',
  },
  positive: {
    color: COLORS.success[600],
  },
  negative: {
    color: COLORS.error[600],
  },
  deleteButton: {
    padding: 4,
  },
  transactionBuilding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  transactionBuildingText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
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
    backgroundColor: COLORS.primary[600],
  },
  saveButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: 'white',
  },
});

export default TransactionsScreen;
