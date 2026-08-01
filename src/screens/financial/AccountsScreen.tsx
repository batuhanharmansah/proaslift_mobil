// 💰 ACCOUNTS SCREEN
// Hesaplar Yönetim Ekranı - CRUD işlemleri
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
import { AccountType } from '../../types';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AccountsScreen: React.FC = () => {
  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();
  const { isEmployee } = useAuth();

  // ==================== STATE ====================
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<AccountType[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountType | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'kasa' as 'kasa' | 'banka' | 'nakit' | 'pos',
    initial_balance: '',
    account_number: '',
    bank_name: '',
    branch_name: '',
    notes: '',
  });

  const [balanceForm, setBalanceForm] = useState({
    new_balance: '',
  });

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (isEmployee) {
      Alert.alert('Yetkisiz Erişim', 'Bu sayfaya sadece admin kullanıcıları erişebilir.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    fetchAccounts();
  }, [isEmployee, navigation]);

  // ==================== FUNCTIONS ====================
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiClient.get(API_ENDPOINTS.FINANCIAL_ACCOUNTS);

      // API client returns response.data, so response is already { success: true, data: [...] }
      if (response?.success && response?.data) {
        const accountsList = Array.isArray(response.data) ? response.data : [];
        setAccounts(accountsList);
      } else if (Array.isArray(response)) {
        setAccounts(response);
      } else if (Array.isArray(response?.data)) {
        setAccounts(response.data);
      } else {
        setAccounts([]);
      }
    } catch (error: any) {
      Alert.alert('Hata', 'Hesaplar yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchAccounts();
    setRefreshing(false);
  }, [fetchAccounts]);

  const handleAddAccount = useCallback(async () => {
    if (!formData.name.trim() || !formData.initial_balance) {
      Alert.alert('Eksik Bilgi', 'Lütfen hesap adı ve başlangıç bakiyesini girin.');
      return;
    }

    try {
      setLoading(true);
      await hapticFeedback.medium();

      const response = await apiClient.post<{ success: boolean; message: string }>(
        API_ENDPOINTS.FINANCIAL_ACCOUNTS,
        {
          name: formData.name.trim(),
          type: formData.type,
          initial_balance: parseFloat(formData.initial_balance),
          account_number: formData.account_number || null,
          bank_name: formData.bank_name || null,
          branch_name: formData.branch_name || null,
          notes: formData.notes || null,
        }
      );

      if (response?.success) {
        Alert.alert('Başarılı', response?.message || 'Hesap oluşturuldu');
        setShowAddModal(false);
        resetForm();
        await fetchAccounts();
      }
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.message || 'Hesap oluşturulamadı');
    } finally {
      setLoading(false);
    }
  }, [formData, fetchAccounts]);

  const handleUpdateBalance = useCallback(async () => {
    if (!balanceForm.new_balance || !selectedAccount) {
      return;
    }

    try {
      setLoading(true);
      await hapticFeedback.medium();

      const response = await apiClient.post<{ success: boolean; message: string }>(
        API_ENDPOINTS.FINANCIAL_ACCOUNT_UPDATE_BALANCE,
        {
          account_id: selectedAccount.id,
          new_balance: parseFloat(balanceForm.new_balance),
        }
      );

      if (response?.success) {
        Alert.alert('Başarılı', response?.message || 'Bakiye güncellendi');
        setShowBalanceModal(false);
        setSelectedAccount(null);
        setBalanceForm({ new_balance: '' });
        await fetchAccounts();
      }
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.message || 'Bakiye güncellenemedi');
    } finally {
      setLoading(false);
    }
  }, [balanceForm, selectedAccount, fetchAccounts]);

  const handleDeleteAccount = useCallback((account: AccountType) => {
    Alert.alert(
      'Hesabı Sil',
      `${account.name} hesabını silmek istediğinizden emin misiniz?`,
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
                `${API_ENDPOINTS.FINANCIAL_ACCOUNTS}/${account.id}`
              );

              if (response?.success) {
                Alert.alert('Başarılı', response?.message || 'Hesap silindi');
                await fetchAccounts();
              }
            } catch (error: any) {
              console.error('Delete account error:', error);
              Alert.alert('Hata', error.response?.data?.message || 'Hesap silinemedi');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [fetchAccounts]);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'kasa',
      initial_balance: '',
      account_number: '',
      bank_name: '',
      branch_name: '',
      notes: '',
    });
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'kasa':
        return 'cash';
      case 'banka':
        return 'card';
      case 'pos':
        return 'card-outline';
      default:
        return 'wallet';
    }
  };

  // ==================== RENDER ====================
  if (isEmployee) {
    return null;
  }

  if (loading && accounts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderAccountItem = ({ item }: { item: AccountType }) => (
    <View style={styles.accountCard}>
      <View style={styles.accountHeader}>
        <View style={styles.accountIcon}>
          <Ionicons name={getAccountIcon(item.type) as any} size={24} color={COLORS.primary[600]} />
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>{item.name}</Text>
          <Text style={styles.accountType}>{item.type_label}</Text>
        </View>
        <Text style={[styles.accountBalance, item.current_balance >= 0 ? styles.positive : styles.negative]}>
          {formatCurrency(item.current_balance)}
        </Text>
      </View>

      {item.bank_name && (
        <View style={styles.accountDetails}>
          <Text style={styles.detailText}>{item.bank_name}</Text>
          {item.account_number && <Text style={styles.detailText}>• {item.account_number}</Text>}
        </View>
      )}

      <View style={styles.accountActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setSelectedAccount(item);
            setBalanceForm({ new_balance: item.current_balance.toString() });
            setShowBalanceModal(true);
          }}
        >
          <Ionicons name="pencil" size={18} color={COLORS.primary[600]} />
          <Text style={styles.actionText}>Bakiye Düzenle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteAccount(item)}
        >
          <Ionicons name="trash" size={18} color={COLORS.error[600]} />
          <Text style={[styles.actionText, styles.deleteText]}>Sil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="Hesaplar"
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

      {/* List */}
      <FlatList
        data={accounts}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        renderItem={renderAccountItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary[500]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color={COLORS.gray[400]} />
            <Text style={styles.emptyText}>Henüz hesap eklenmemiş</Text>
            <Text style={styles.emptySubtext}>Yeni hesap eklemek için + butonuna tıklayın</Text>
          </View>
        }
        // Performance optimizations
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: 120, // Approximate item height
          offset: 120 * index,
          index,
        })}
      />

      {/* Add Account Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Hesap Ekle</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Hesap Adı *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Örn: Ana Kasa"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Hesap Türü *</Text>
                <View style={styles.typeButtons}>
                  {(['kasa', 'banka', 'nakit', 'pos'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        formData.type === type && styles.typeButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, type })}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          formData.type === type && styles.typeButtonTextActive,
                        ]}
                      >
                        {type === 'kasa' ? 'Kasa' : type === 'banka' ? 'Banka' : type === 'nakit' ? 'Nakit' : 'POS'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Başlangıç Bakiyesi *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={formData.initial_balance}
                  onChangeText={(text) => setFormData({ ...formData, initial_balance: text })}
                />
              </View>

              {formData.type === 'banka' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Banka Adı</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Banka adı"
                      value={formData.bank_name}
                      onChangeText={(text) => setFormData({ ...formData, bank_name: text })}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Şube Adı</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Şube adı"
                      value={formData.branch_name}
                      onChangeText={(text) => setFormData({ ...formData, branch_name: text })}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Hesap Numarası</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Hesap numarası"
                      value={formData.account_number}
                      onChangeText={(text) => setFormData({ ...formData, account_number: text })}
                    />
                  </View>
                </>
              )}

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
                onPress={handleAddAccount}
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

      {/* Update Balance Modal */}
      <Modal
        visible={showBalanceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBalanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bakiye Düzenle</Text>
              <TouchableOpacity onPress={() => setShowBalanceModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </TouchableOpacity>
            </View>

            {selectedAccount && (
              <View style={styles.formContainer}>
                <Text style={styles.label}>Hesap: {selectedAccount.name}</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Yeni Bakiye *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={balanceForm.new_balance}
                    onChangeText={(text) => setBalanceForm({ new_balance: text })}
                  />
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowBalanceModal(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateBalance}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Güncelle</Text>
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
  content: {
    flex: 1,
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
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  accountCard: {
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
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  accountType: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
    marginTop: 2,
  },
  accountBalance: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
  },
  positive: {
    color: COLORS.success[600],
  },
  negative: {
    color: COLORS.error[600],
  },
  accountDetails: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  detailText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
  },
  accountActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: COLORS.gray[100],
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: COLORS.error[50],
  },
  actionText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[600],
    fontWeight: '500',
  },
  deleteText: {
    color: COLORS.error[600],
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  formContainer: {
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
    marginTop: 24,
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

export default AccountsScreen;
