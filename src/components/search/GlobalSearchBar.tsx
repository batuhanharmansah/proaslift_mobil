// 🔍 GLOBAL SEARCH BAR COMPONENT
// Tüm modüllerde kullanılabilir, gelişmiş arama özellikleri

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback } from '../../utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface SearchResult {
  id: string | number;
  type: 'building' | 'employee' | 'maintenance' | 'issue' | 'notification';
  title: string;
  subtitle?: string;
  data?: any;
}

interface GlobalSearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onResultPress?: (result: SearchResult) => void;
  searchFunction?: (query: string) => Promise<SearchResult[]>;
  debounceMs?: number;
  showResults?: boolean;
  autoFocus?: boolean;
}

const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  placeholder = 'Ara...',
  onSearch,
  onResultPress,
  searchFunction,
  debounceMs = 300,
  showResults = true,
  autoFocus = false,
}) => {
  // ==================== STATE ====================
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);

  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  // ==================== HANDLERS ====================
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Call onSearch callback immediately
    if (onSearch) {
      onSearch(text);
    }

    // If searchFunction provided, perform search
    if (searchFunction && text.trim().length > 0) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const searchResults = await searchFunction(text.trim());
          setResults(searchResults);
        } catch (error) {
          console.error('❌ Search error:', error);
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      }, debounceMs);
    } else if (text.trim().length === 0) {
      setResults([]);
      setIsSearching(false);
    }
  }, [onSearch, searchFunction, debounceMs]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setResults([]);
    setIsSearching(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    inputRef.current?.focus();
  }, []);

  const handleResultPress = useCallback(async (result: SearchResult) => {
    await hapticFeedback.light();

    // Custom handler
    if (onResultPress) {
      onResultPress(result);
      return;
    }

    // Default navigation based on type
    switch (result.type) {
      case 'building':
        navigation.navigate('BuildingDetail', {
          buildingId: typeof result.id === 'number' ? result.id : parseInt(result.id.toString()),
        });
        break;
      case 'employee':
        // Employee detail navigation (if exists)
        break;
      case 'maintenance':
        if (result.data?.maintenanceScheduleId) {
          navigation.navigate('ActiveJob', {
            maintenanceScheduleId: result.data.maintenanceScheduleId,
            maintenanceSchedule: result.data.maintenanceSchedule || null,
          });
        }
        break;
      case 'issue':
        // Issue detail navigation (if exists)
        break;
      default:
        break;
    }

    // Close search
    handleClear();
  }, [onResultPress, navigation]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Delay blur to allow result press
    setTimeout(() => {
      setIsFocused(false);
    }, 200);
  }, []);

  // ==================== RENDER HELPERS ====================
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'building': return 'business';
      case 'employee': return 'person';
      case 'maintenance': return 'construct';
      case 'issue': return 'warning';
      case 'notification': return 'notifications';
      default: return 'search';
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'building': return COLORS.primary[500];
      case 'employee': return COLORS.blue[500];
      case 'maintenance': return COLORS.warning[500];
      case 'issue': return COLORS.error[500];
      case 'notification': return COLORS.success[500];
      default: return COLORS.gray[500];
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.resultIcon,
          { backgroundColor: `${getResultColor(item.type)}20` },
        ]}
      >
        <Ionicons
          name={getResultIcon(item.type)}
          size={20}
          color={getResultColor(item.type)}
        />
      </View>
      
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={styles.resultSubtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        )}
      </View>
      
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
    </TouchableOpacity>
  );

  // ==================== RENDER ====================
  const showResultsModal = showResults && isFocused && searchQuery.length > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, isFocused && styles.searchContainerFocused]}>
        <Ionicons name="search" size={20} color={COLORS.gray[400]} style={styles.searchIcon} />
        
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={COLORS.gray[400]}
          value={searchQuery}
          onChangeText={handleSearchChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        
        {isSearching && (
          <ActivityIndicator size="small" color={COLORS.primary[500]} style={styles.loader} />
        )}
        
        {searchQuery.length > 0 && !isSearching && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Results Modal */}
      {showResultsModal && (
        <Modal
          visible={showResultsModal}
          transparent
          animationType="fade"
          onRequestClose={handleBlur}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleBlur}
          >
            <View style={styles.resultsContainer}>
              {results.length > 0 ? (
                <FlatList
                  data={results}
                  renderItem={renderSearchResult}
                  keyExtractor={(item) => `${item.type}-${item.id}`}
                  keyboardShouldPersistTaps="handled"
                  maxToRenderPerBatch={10}
                  windowSize={5}
                />
              ) : (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={48} color={COLORS.gray[300]} />
                  <Text style={styles.noResultsText}>Sonuç bulunamadı</Text>
                  <Text style={styles.noResultsSubtext}>
                    '{searchQuery}' için sonuç bulunamadı
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  searchContainerFocused: {
    backgroundColor: 'white',
    borderColor: COLORS.primary[500],
    shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[900],
    paddingVertical: 0,
  },
  loader: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 100,
  },
  resultsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  noResults: {
    padding: 32,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
});

export default GlobalSearchBar;
