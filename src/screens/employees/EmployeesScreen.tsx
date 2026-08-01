// 👥 ENTERPRISE EMPLOYEES SCREEN
// Personel yönetimi, filtreleme, performans takibi

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  Alert,
  SafeAreaView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CustomSidebar from '../../components/navigation/CustomSidebar';

// Hooks & Services
import { hapticFeedback } from '../../utils';
import { COLORS, DIMENSIONS, API_ENDPOINTS } from '../../constants';
import { apiClient } from '../../services/api/client';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../store/authStore';

interface EmployeeItem {
  id: number;
  full_name: string;
  position_label?: string;
  phone?: string;
  is_active?: boolean;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const EmployeesScreen: React.FC = () => {
  // ==================== STATE ====================
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);

  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();
  const { isEmployee } = useAuth();

  const fetchEmployees = useCallback(async () => {
    try {
      const res = (await apiClient.get(API_ENDPOINTS.EMPLOYEES)) as any;
      const list = Array.isArray(res?.data) ? res.data : res?.data?.data ?? [];
      setEmployees(list);
    } catch (e) {
      console.error('Personel listesi yüklenemedi:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // ==================== HANDLERS ====================
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchEmployees();
  }, [fetchEmployees]);

  const handleCall = useCallback(async (phoneNumber: string) => {
    const phone = phoneNumber.replace(/\s/g, ''); // Boşlukları kaldır
    const url = `tel:${phone}`;
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        await hapticFeedback.success();
      } else {
        Alert.alert('Hata', 'Telefon araması yapılamıyor');
      }
    } catch (error) {
      Alert.alert('Hata', 'Arama başlatılamadı');
    }
  }, []);

  const handleEmployeePress = useCallback((employee: EmployeeItem) => {
    hapticFeedback.light();

    // Çalışan ise sadece arama seçeneği
    if (isEmployee) {
      Alert.alert(
        employee.full_name,
        employee.phone ? 'Bu personeli aramak ister misiniz?' : 'Bu personel için telefon numarası yok.',
        [
          ...(employee.phone ? [{ text: 'Ara' as const, onPress: () => handleCall(employee.phone!) }] : []),
          { text: 'İptal', style: 'cancel' as const },
        ],
        { cancelable: true }
      );
    } else {
      // Admin ise arama ve detay seçenekleri
      const buttons: Array<{ text: string; onPress?: () => void; style?: 'cancel' }> = [
        ...(employee.phone ? [{ text: 'Ara', onPress: () => handleCall(employee.phone!) }] : []),
        {
          text: 'Detay Sayfası',
          onPress: () => {
            hapticFeedback.light();
            navigation.navigate('EmployeeDetail', { employeeId: employee.id });
          },
        },
        { text: 'İptal', style: 'cancel' },
      ];
      Alert.alert(employee.full_name, 'Ne yapmak istersiniz?', buttons, { cancelable: true });
    }
  }, [handleCall, isEmployee, navigation]);

  // ==================== RENDER METHODS ====================
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setSidebarVisible(true)}
        >
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Personel</Text>
          <Text style={styles.headerSubtitle}>{employees.length} Çalışan</Text>
        </View>
      </View>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchSection}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color={COLORS.gray[400]} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Personel ara..."
          placeholderTextColor={COLORS.gray[400]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchButton}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderEmployeeItem = ({ item }: { item: EmployeeItem }) => {
    const initials = item.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2);
    const isActive = item.is_active !== false;
    return (
      <TouchableOpacity
        style={styles.employeeCard}
        onPress={() => handleEmployeePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.employeeAvatar}>
          <Text style={styles.employeeInitials}>{initials}</Text>
        </View>

        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{item.full_name}</Text>
          <Text style={styles.employeePosition}>{item.position_label || '-'}</Text>
          {item.phone && (
            <View style={styles.employeeContact}>
              <Ionicons name="call" size={14} color={COLORS.gray[500]} />
              <Text style={styles.employeePhone}>{item.phone}</Text>
            </View>
          )}
        </View>

        <View style={[styles.statusBadge, { backgroundColor: isActive ? COLORS.success[50] : COLORS.gray[100] }]}>
          <View style={[styles.statusDot, { backgroundColor: isActive ? COLORS.success[500] : COLORS.gray[500] }]} />
          <Text style={[styles.statusText, { color: isActive ? COLORS.success[700] : COLORS.gray[700] }]}>
            {isActive ? 'Aktif' : 'Pasif'}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color={COLORS.gray[300]} />
      <Text style={styles.emptyTitle}>Personel Bulunamadı</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Arama kriterlerine uygun personel bulunamadı' : 'Henüz personel eklenmemiş'}
      </Text>
    </View>
  );

  // ==================== MAIN RENDER ====================
  return (
    <SafeAreaView style={styles.container}>
      <CustomSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />
      
      {renderHeader()}
      {renderSearchBar()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
        </View>
      ) : (
      <FlatList
        data={employees.filter(
          (emp) =>
            emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (emp.position_label ?? '').toLowerCase().includes(searchQuery.toLowerCase())
        )}
        renderItem={renderEmployeeItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary[500]]}
            tintColor={COLORS.primary[500]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        // Performance optimizations
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: 100, // Approximate item height
          offset: 100 * index,
          index,
        })}
      />
      )}
    </SafeAreaView>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  
  // Header
  header: {
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  
  // Search Section
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[900],
  },
  clearSearchButton: {
    padding: 4,
  },
  
  // List
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: DIMENSIONS.SCREEN_PADDING,
  },
  
  // Employee Card
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  employeeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.warning[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  employeeInitials: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: 'white',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  employeePosition: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginBottom: 4,
  },
  employeeContact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeePhone: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[500],
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
});

export default EmployeesScreen;
