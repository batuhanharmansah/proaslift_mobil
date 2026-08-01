// 🏢 ENTERPRISE BUILDINGS SCREEN
// Gelişmiş filtreleme, arama, QR kod desteği, performans optimizasyonu

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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CustomSidebar from '../../components/navigation/CustomSidebar';

// Hooks & Services
import { useBuildings } from '../../store/buildingsStore';
import { useAuth } from '../../store/authStore';
import { formatCurrency, formatDate, hapticFeedback, debounce } from '../../utils';
import { COLORS, DIMENSIONS } from '../../constants';
import { Building, RootStackParamList } from '../../types';

// Components
import BuildingCard from '../../components/cards/BuildingCard';
import FilterModal from '../../components/modals/FilterModal';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const BuildingsScreen: React.FC = () => {
  // ==================== STATE ====================
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();
  const { isEmployee } = useAuth();
  const {
    buildings,
    filters,
    pagination,
    isLoading,
    error,
    activeBuildings,
    criticalBuildings,
    hasMore,
    fetchBuildings,
    searchBuildings,
    setFilters,
    clearFilters,
    refreshBuildings,
    clearError,
  } = useBuildings();

  // ==================== EFFECTS ====================
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      fetchBuildings(1, undefined, controller.signal);
      return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      searchBuildings(query);
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery]);

  // ==================== HANDLERS ====================
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    
    try {
      await refreshBuildings();
      await hapticFeedback.success();
    } catch (error) {
      await hapticFeedback.error();
    } finally {
      setRefreshing(false);
    }
  }, [refreshBuildings]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchBuildings(pagination.currentPage + 1);
    }
  }, [isLoading, hasMore, pagination.currentPage]);

  const handleBuildingPress = useCallback(async (building: Building) => {
    await hapticFeedback.light();
    navigation.navigate('BuildingDetail', { buildingId: building.id });
  }, [navigation]);

  const handleQRScan = useCallback(async () => {
    await hapticFeedback.medium();
    navigation.navigate('QRScanner');
  }, [navigation]);

  const handleFilterPress = useCallback(async () => {
    await hapticFeedback.light();
    setShowFilters(true);
  }, []);

  const handleApplyFilters = useCallback((newFilters: any) => {
    setFilters(newFilters);
    setShowFilters(false);
    fetchBuildings(1, newFilters);
  }, [setFilters, fetchBuildings]);

  const handleClearFilters = useCallback(() => {
    clearFilters();
    setSearchQuery('');
    setShowFilters(false);
    fetchBuildings(1, {});
  }, [clearFilters, fetchBuildings]);

  const handleAddBuilding = useCallback(async () => {
    await hapticFeedback.light();
    navigation.navigate('BuildingCreate');
  }, [navigation]);

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
          <Text style={styles.headerTitle}>Binalar</Text>
          <Text style={styles.headerSubtitle}>{buildings.length} Bina</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddBuilding}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchSection}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color={COLORS.gray[400]} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Bina ara..."
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
      
      <TouchableOpacity
        style={styles.filterButton}
        onPress={handleFilterPress}
      >
        <Ionicons name="filter" size={20} color={COLORS.primary[600]} />
      </TouchableOpacity>
    </View>
  );

  const renderQuickStats = () => (
    <View style={styles.quickStatsContainer}>
      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{buildings.length}</Text>
          <Text style={styles.statLabel}>Toplam</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.success[500] }]}>
            {activeBuildings.length}
          </Text>
          <Text style={styles.statLabel}>Aktif</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.error[500] }]}>
            {criticalBuildings.length}
          </Text>
          <Text style={styles.statLabel}>Kritik</Text>
        </View>
      </View>

      {/* Active Filters */}
      {filters && Object.keys(filters).length > 0 && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText}>Aktif Filtreler:</Text>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={handleClearFilters}
          >
            <Text style={styles.clearFiltersText}>Temizle</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderBuildingItem = ({ item }: { item: Building }) => (
    <BuildingCard
      building={item}
      onPress={() => handleBuildingPress(item)}
      isEmployee={isEmployee}
    />
  );

  const renderFooter = () => {
    if (!isLoading || buildings.length === 0) return null;

    return (
      <View style={styles.loadingFooter}>
        <LoadingSpinner size="small" />
        <Text style={styles.loadingText}>Daha fazla bina yükleniyor...</Text>
      </View>
    );
  };

  const renderListEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingEmptyContainer}>
          <LoadingSpinner size="large" />
          <Text style={styles.loadingEmptyText}>Binalar yükleniyor…</Text>
        </View>
      );
    }
    return renderEmptyState();
  };

  const renderEmptyState = () => (
    <EmptyState
      icon="business-outline"
      title="Bina Bulunamadı"
      subtitle={
        (filters && Object.keys(filters).length > 0) || searchQuery
          ? "Arama kriterlerinize uygun bina bulunamadı"
          : "Henüz kayıtlı bina bulunmuyor"
      }
      actionText={(filters && Object.keys(filters).length > 0) || searchQuery ? "Filtreleri Temizle" : undefined}
      onActionPress={(filters && Object.keys(filters).length > 0) || searchQuery ? handleClearFilters : undefined}
    />
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
      
      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={COLORS.error[500]} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Ionicons name="close" size={20} color={COLORS.error[500]} />
          </TouchableOpacity>
        </View>
      )}

      {/* Buildings List */}
      <FlatList
        data={buildings}
        renderItem={renderBuildingItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContainer,
          buildings.length === 0 ? styles.listContainerFlex : null,
        ]}
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderListEmpty}
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

      {/* Filter Modal */}
      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        currentFilters={filters}
      />
    </SafeAreaView>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  
  // Header styles
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
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.primary[700],
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginRight: 8,
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
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.primary[50],
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrButton: {
    width: 44,
    height: 44,
    backgroundColor: COLORS.primary[50],
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Quick stats
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  statLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
    marginTop: 2,
  },

  // Active filters
  activeFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  activeFiltersText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  clearFiltersButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearFiltersText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[600],
    fontWeight: '600',
  },

  // List styles
  listContainer: {
    padding: DIMENSIONS.SCREEN_PADDING,
  },
  listContainerFlex: {
    flexGrow: 1,
  },
  loadingEmptyContainer: {
    flex: 1,
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingEmptyText: {
    marginTop: 16,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[500],
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[500],
    marginLeft: 8,
  },

  // Error styles
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error[50],
    padding: 12,
    marginHorizontal: DIMENSIONS.SCREEN_PADDING,
    marginVertical: 8,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    borderWidth: 1,
    borderColor: COLORS.error[200],
  },
  errorText: {
    flex: 1,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.error[700],
    marginHorizontal: 8,
  },
});

export default BuildingsScreen;
