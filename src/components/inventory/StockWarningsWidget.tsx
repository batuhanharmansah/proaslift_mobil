// 📦 STOCK WARNINGS WIDGET
// Stok uyarıları - Sadece admin için görünür

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { COLORS, DIMENSIONS, API_ENDPOINTS } from '../../constants';
import { apiClient } from '../../services/api/client';
import { hapticFeedback } from '../../utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface StockWarning {
  id: number;
  material_id: number;
  material_name: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  last_used_date?: string;
}

interface StockWarningsWidgetProps {
  limit?: number;
  showHeader?: boolean;
  onPress?: () => void;
}

const StockWarningsWidget: React.FC<StockWarningsWidgetProps> = ({
  limit = 5,
  showHeader = true,
  onPress,
}) => {
  // ==================== STATE ====================
  const [warnings, setWarnings] = useState<StockWarning[]>([]);
  const [loading, setLoading] = useState(false);

  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchStockWarnings();
    
    // Her 5 dakikada bir güncelle
    const interval = setInterval(fetchStockWarnings, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // ==================== HANDLERS ====================
  const fetchStockWarnings = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await apiClient.get<{
        success: boolean;
        data: StockWarning[];
        message?: string;
      }>(API_ENDPOINTS.STOCK_WARNINGS, {
        params: { limit },
      });
      
      if (response.data.success && response.data.data) {
        // Kritik ve yüksek öncelikli uyarıları önce göster
        const sortedWarnings = response.data.data
          .sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          })
          .slice(0, limit);
        
        setWarnings(sortedWarnings);
      } else {
        console.warn('⚠️ No stock warnings data received');
        setWarnings([]);
      }
    } catch (error: any) {
      console.error('❌ Fetch stock warnings error:', error);
      
      // API hatası durumunda boş array göster
      setWarnings([]);
      
      // Network hatası değilse log'la
      if (error.response?.status !== 404) {
        console.error('Stock warnings API error details:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const handlePress = useCallback(() => {
    hapticFeedback.light();
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('Depot');
    }
  }, [onPress, navigation]);

  // ==================== RENDER HELPERS ====================
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return COLORS.error[500];
      case 'high': return COLORS.warning[500];
      case 'medium': return COLORS.blue[500];
      default: return COLORS.gray[500];
    }
  };

  const getPriorityIcon = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'alert-circle';
      case 'high': return 'warning';
      case 'medium': return 'information-circle';
      default: return 'ellipse-outline';
    }
  };

  const getPriorityLabel = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'KRİTİK';
      case 'high': return 'YÜKSEK';
      case 'medium': return 'ORTA';
      default: return 'DÜŞÜK';
    }
  };

  const renderWarningItem = ({ item }: { item: StockWarning }) => (
    <View style={styles.warningItem}>
      <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(item.priority) }]} />
      
      <View style={styles.warningContent}>
        <View style={styles.warningHeader}>
          <Text style={styles.materialName} numberOfLines={1}>
            {item.material_name}
          </Text>
          <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(item.priority)}20` }]}>
            <Text style={[styles.priorityBadgeText, { color: getPriorityColor(item.priority) }]}>
              {getPriorityLabel(item.priority)}
            </Text>
          </View>
        </View>
        
        <View style={styles.stockInfo}>
          <Text style={styles.stockText}>
            Mevcut: <Text style={styles.stockValue}>{item.current_stock}</Text> {item.unit}
          </Text>
          <Text style={styles.minStockText}>
            Minimum: {item.min_stock} {item.unit}
          </Text>
        </View>
      </View>
      
      <Ionicons 
        name={getPriorityIcon(item.priority)} 
        size={24} 
        color={getPriorityColor(item.priority)} 
      />
    </View>
  );

  // ==================== RENDER ====================
  if (warnings.length === 0 && !loading) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {showHeader && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error[500]} />
            <Text style={styles.headerTitle}>Stok Uyarıları</Text>
            {warnings.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{warnings.length}</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
        </View>
      )}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : warnings.length > 0 ? (
        <View style={styles.warningsList}>
          {warnings.map((warning) => (
            <View key={warning.id}>
              {renderWarningItem({ item: warning })}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={32} color={COLORS.success[500]} />
          <Text style={styles.emptyText}>Stok uyarısı yok</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  badge: {
    backgroundColor: COLORS.error[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: 'bold',
    color: 'white',
  },
  warningsList: {
    gap: 8,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  priorityIndicator: {
    width: 4,
    height: '100%',
    marginRight: 12,
    borderRadius: 2,
  },
  warningContent: {
    flex: 1,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  materialName: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[900],
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: 'bold',
  },
  stockInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  stockText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
  },
  stockValue: {
    fontWeight: 'bold',
    color: COLORS.error[500],
  },
  minStockText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[500],
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
});

export default StockWarningsWidget;
