// 💰 FINANCIAL SCREEN
// Ana Finansal Yönetim Ekranı - Dashboard, İstatistikler, Hızlı İşlemler
// SADECE ADMIN KULLANICILAR İÇİN

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
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
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import { FinancialSummary, AccountType, AccountingEntry, Receivable, Payable } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FinancialScreen: React.FC = () => {
  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();
  const { user, isEmployee } = useAuth();

  // ==================== STATE ====================
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [accounts, setAccounts] = useState<AccountType[]>([]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    // Sadece admin için göster
    if (isEmployee) {
      Alert.alert('Yetkisiz Erişim', 'Bu sayfaya sadece admin kullanıcıları erişebilir.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    fetchData();
  }, [isEmployee, navigation]);

  // ==================== FUNCTIONS ====================
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Financial Summary
      const summaryResponse = await apiClient.get(API_ENDPOINTS.FINANCIAL_SUMMARY);
      
      if (summaryResponse?.success && summaryResponse?.data) {
        setSummary(summaryResponse.data);
      }

      // Accounts
      const accountsResponse = await apiClient.get(API_ENDPOINTS.FINANCIAL_ACCOUNTS);
      
      if (accountsResponse?.success && accountsResponse?.data) {
        const accountsList = Array.isArray(accountsResponse.data) ? accountsResponse.data : [];
        setAccounts(accountsList);
      } else if (Array.isArray(accountsResponse)) {
        setAccounts(accountsResponse);
      } else if (Array.isArray(accountsResponse?.data)) {
        setAccounts(accountsResponse.data);
      }
    } catch (error: any) {
      console.error('Fetch financial data error:', error);
      Alert.alert('Hata', 'Finansal veriler yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ==================== RENDER ====================
  if (isEmployee) {
    return null;
  }

  if (loading && !summary) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="Finansal Yönetim"
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary[500]} />
        }
      >
        {/* İstatistik Kartları */}
        {summary && (
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, styles.statCardBlue]}>
                <Ionicons name="wallet-outline" size={24} color={COLORS.primary[600]} />
                <Text style={styles.statLabel}>Toplam Bakiye</Text>
                <Text style={[styles.statValue, styles.statValueBlue]}>
                  {formatCurrency(summary.stats.total_balance)}
                </Text>
              </View>

              <View style={[styles.statCard, styles.statCardGreen]}>
                <Ionicons name="trending-up-outline" size={24} color={COLORS.success[600]} />
                <Text style={styles.statLabel}>Bu Ay Gelir</Text>
                <Text style={[styles.statValue, styles.statValueGreen]}>
                  {formatCurrency(summary.stats.monthly_income)}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statCard, styles.statCardRed]}>
                <Ionicons name="trending-down-outline" size={24} color={COLORS.error[600]} />
                <Text style={styles.statLabel}>Bu Ay Gider</Text>
                <Text style={[styles.statValue, styles.statValueRed]}>
                  {formatCurrency(summary.stats.monthly_expense)}
                </Text>
              </View>

              <View style={[styles.statCard, styles.statCardYellow]}>
                <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.warning[600]} />
                <Text style={styles.statLabel}>Toplam Alacak</Text>
                <Text style={[styles.statValue, styles.statValueYellow]}>
                  {formatCurrency(summary.stats.total_receivables)}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statCard, styles.statCardOrange]}>
                <Ionicons name="alert-circle-outline" size={24} color={COLORS.warning[700]} />
                <Text style={styles.statLabel}>Toplam Borç</Text>
                <Text style={[styles.statValue, styles.statValueOrange]}>
                  {formatCurrency(summary.stats.total_payables)}
                </Text>
              </View>

              <View style={[styles.statCard, styles.statCardPurple]}>
                <Ionicons name="calculator-outline" size={24} color={COLORS.primary[700]} />
                <Text style={styles.statLabel}>Net Gelir</Text>
                <Text style={[styles.statValue, { color: summary.stats.net_income >= 0 ? COLORS.success[600] : COLORS.error[600] }]}>
                  {formatCurrency(summary.stats.net_income)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Hesap Türleri Özeti - Hesaplar sayfasına kısayol */}
        {accounts.length > 0 && (() => {
          const typeLabels: Record<string, string> = { kasa: 'Kasa', banka: 'Banka', nakit: 'Nakit', pos: 'POS' };
          const typeCounts: Record<string, number> = {};
          accounts.forEach((a) => {
            const t = (a.type || 'banka') as string;
            typeCounts[t] = (typeCounts[t] || 0) + 1;
          });
          const typesWithCount = Object.entries(typeCounts).filter(([, c]) => c > 0);
          if (typesWithCount.length === 0) return null;
          return (
            <View style={styles.accountTypesSection}>
              <Text style={styles.sectionTitle}>Hesap Türleri</Text>
              <View style={styles.accountTypesRow}>
                {typesWithCount.map(([type, count]) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.accountTypeChip}
                    onPress={() => navigation.navigate('Accounts')}
                  >
                    <Text style={styles.accountTypeChipText}>
                      {typeLabels[type] || type} ({count})
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.accountTypeChipAll} onPress={() => navigation.navigate('Accounts')}>
                  <Text style={styles.accountTypeChipAllText}>Tümü</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        {/* Hızlı Erişim Butonları */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Accounts')}
            >
              <Ionicons name="wallet" size={28} color={COLORS.primary[600]} />
              <Text style={styles.quickActionText}>Hesaplar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('UnifiedTransactions')}
            >
              <Ionicons name="list" size={28} color={COLORS.success[600]} />
              <Text style={styles.quickActionText}>İşlemler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Receivables')}
            >
              <Ionicons name="arrow-down-circle" size={28} color={COLORS.warning[600]} />
              <Text style={styles.quickActionText}>Alacaklar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Payables')}
            >
              <Ionicons name="arrow-up-circle" size={28} color={COLORS.error[600]} />
              <Text style={styles.quickActionText}>Borçlar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('RecurringPayments')}
            >
              <Ionicons name="repeat" size={28} color={COLORS.primary[700]} />
              <Text style={styles.quickActionText}>Düzenli Ödemeler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('DayEnd')}
            >
              <Ionicons name="calendar" size={28} color={COLORS.primary[600]} />
              <Text style={styles.quickActionText}>Gün Sonu</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hesaplar Özet */}
        {accounts.length > 0 && (
          <View style={styles.accountsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hesaplar ({accounts.length})</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Accounts')}>
                <Text style={styles.seeAllText}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>
            {accounts.slice(0, 3).map((account) => (
              <TouchableOpacity
                key={account.id}
                style={styles.accountItem}
                onPress={() => navigation.navigate('Accounts')}
              >
                <View style={styles.accountIcon}>
                  <Ionicons
                    name={account.type === 'kasa' ? 'cash' : account.type === 'banka' ? 'card' : 'wallet'}
                    size={24}
                    color={COLORS.primary[600]}
                  />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountType}>{account.type_label}</Text>
                </View>
                <Text style={[styles.accountBalance, account.current_balance >= 0 ? styles.positive : styles.negative]}>
                  {formatCurrency(account.current_balance)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Son İşlemler */}
        {summary && summary.recent_transactions.length > 0 && (
          <View style={styles.transactionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Son İşlemler</Text>
              <TouchableOpacity onPress={() => navigation.navigate('UnifiedTransactions')}>
                <Text style={styles.seeAllText}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>
            {summary.recent_transactions.slice(0, 5).map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={[styles.transactionIcon, transaction.type === 'gelir' ? styles.iconIncome : styles.iconExpense]}>
                  <Ionicons
                    name={transaction.type === 'gelir' ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color="white"
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription} numberOfLines={1}>
                    {transaction.description}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.transaction_date, 'short')}
                  </Text>
                </View>
                <Text style={[styles.transactionAmount, transaction.type === 'gelir' ? styles.positive : styles.negative]}>
                  {transaction.type === 'gelir' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Yaklaşan Alacaklar */}
        {summary && summary.upcoming_receivables.length > 0 && (
          <View style={styles.receivablesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Yaklaşan Alacaklar</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Receivables')}>
                <Text style={styles.seeAllText}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>
            {summary.upcoming_receivables.slice(0, 3).map((receivable) => (
              <TouchableOpacity
                key={receivable.id}
                style={styles.receivableItem}
                onPress={() => navigation.navigate('Receivables')}
              >
                <View style={styles.receivableIcon}>
                  <Ionicons name="time-outline" size={20} color={COLORS.warning[600]} />
                </View>
                <View style={styles.receivableInfo}>
                  <Text style={styles.receivableTitle} numberOfLines={1}>
                    {receivable.title}
                  </Text>
                  <Text style={styles.receivableDate}>
                    {formatDate(receivable.due_date, 'short')} • {receivable.building?.name}
                  </Text>
                </View>
                <Text style={styles.receivableAmount}>
                  {formatCurrency(receivable.remaining_amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Yaklaşan Borçlar */}
        {summary && summary.upcoming_payables.length > 0 && (
          <View style={styles.payablesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Yaklaşan Borçlar</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Payables')}>
                <Text style={styles.seeAllText}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>
            {summary.upcoming_payables.slice(0, 3).map((payable) => (
              <TouchableOpacity
                key={payable.id}
                style={styles.payableItem}
                onPress={() => navigation.navigate('Payables')}
              >
                <View style={styles.payableIcon}>
                  <Ionicons name="time-outline" size={20} color={COLORS.error[600]} />
                </View>
                <View style={styles.payableInfo}>
                  <Text style={styles.payableTitle} numberOfLines={1}>
                    {payable.title}
                  </Text>
                  <Text style={styles.payableDate}>
                    {formatDate(payable.due_date, 'short')} • {payable.category_label}
                  </Text>
                </View>
                <Text style={styles.payableAmount}>
                  {formatCurrency(payable.remaining_amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
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
  statsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardBlue: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary[500],
  },
  statCardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success[500],
  },
  statCardRed: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error[500],
  },
  statCardYellow: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning[500],
  },
  statCardOrange: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning[700],
  },
  statCardPurple: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary[700],
  },
  statLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
    marginTop: 8,
  },
  statValue: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statValueBlue: {
    color: COLORS.primary[600],
  },
  statValueGreen: {
    color: COLORS.success[600],
  },
  statValueRed: {
    color: COLORS.error[600],
  },
  statValueYellow: {
    color: COLORS.warning[600],
  },
  statValueOrange: {
    color: COLORS.warning[700],
  },
  accountTypesSection: {
    marginBottom: 20,
  },
  accountTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  accountTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary[50],
  },
  accountTypeChipText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.primary[700],
  },
  accountTypeChipAll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.gray[200],
  },
  accountTypeChipAllText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  quickActionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    width: '30%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[700],
    marginTop: 8,
    textAlign: 'center',
  },
  accountsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[600],
    fontWeight: '600',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: 'bold',
  },
  positive: {
    color: COLORS.success[600],
  },
  negative: {
    color: COLORS.error[600],
  },
  transactionsSection: {
    marginBottom: 24,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '500',
    color: COLORS.gray[900],
  },
  transactionDate: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: 'bold',
  },
  receivablesSection: {
    marginBottom: 24,
  },
  receivableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  receivableIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.warning[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  receivableInfo: {
    flex: 1,
  },
  receivableTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '500',
    color: COLORS.gray[900],
  },
  receivableDate: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
    marginTop: 2,
  },
  receivableAmount: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: 'bold',
    color: COLORS.warning[600],
  },
  payablesSection: {
    marginBottom: 24,
  },
  payableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  payableIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.error[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  payableInfo: {
    flex: 1,
  },
  payableTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '500',
    color: COLORS.gray[900],
  },
  payableDate: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
    marginTop: 2,
  },
  payableAmount: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: 'bold',
    color: COLORS.error[600],
  },
});

export default FinancialScreen;
