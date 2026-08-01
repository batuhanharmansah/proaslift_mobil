// 📋 MATERIALS LIST COMPONENT
// Kullanılan malzemeler listesi - Sadece admin için görünür

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DIMENSIONS, API_ENDPOINTS } from '../../constants';
import { apiClient } from '../../services/api/client';
import { hapticFeedback } from '../../utils';

export interface Material {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  cost?: number;
  category?: string;
  used_date?: string;
  maintenance_schedule_id?: number;
}

interface MaterialsListProps {
  maintenanceScheduleId?: number;
  showHeader?: boolean;
  compact?: boolean;
  onMaterialPress?: (material: Material) => void;
}

const MaterialsList: React.FC<MaterialsListProps> = ({
  maintenanceScheduleId,
  showHeader = true,
  compact = false,
  onMaterialPress,
}) => {
  // ==================== STATE ====================
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (maintenanceScheduleId) {
      fetchMaterials();
    }
  }, [maintenanceScheduleId]);

  // ==================== HANDLERS ====================
  const fetchMaterials = useCallback(async () => {
    if (!maintenanceScheduleId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(API_ENDPOINTS.MAINTENANCE_DETAIL(maintenanceScheduleId)) as any;
      const report = res?.data?.maintenance_report ?? res?.data?.maintenanceReport;
      const used = report?.used_products;
      if (Array.isArray(used) && used.length > 0) {
        const mapped: Material[] = used.map((p: any, i: number) => ({
          id: p.product_id || i + 1,
          name: p.product_name || p.name || `Ürün ${p.product_id}`,
          quantity: Number(p.quantity) || 1,
          unit: p.unit || 'adet',
          cost: p.unit_price ?? p.subtotal,
          used_date: p.used_date,
          maintenance_schedule_id: maintenanceScheduleId,
        }));
        setMaterials(mapped);
        return;
      }
      setMaterials([]);
    } catch (error) {
      console.error('❌ Fetch materials error:', error);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, [maintenanceScheduleId]);

  const handleMaterialPress = useCallback((material: Material) => {
    hapticFeedback.light();
    if (onMaterialPress) {
      onMaterialPress(material);
    } else {
      Alert.alert(
        material.name,
        `Miktar: ${material.quantity} ${material.unit}\n${material.cost ? `Maliyet: ₺${material.cost.toFixed(2)}` : ''}\n${material.category ? `Kategori: ${material.category}` : ''}`,
        [{ text: 'Tamam' }]
      );
    }
  }, [onMaterialPress]);

  // ==================== RENDER HELPERS ====================
  const getTotalCost = (): number => {
    return materials.reduce((sum, material) => sum + (material.cost || 0), 0);
  };

  const renderMaterialItem = ({ item }: { item: Material }) => (
    <TouchableOpacity
      style={[styles.materialItem, compact && styles.materialItemCompact]}
      onPress={() => handleMaterialPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.materialIcon}>
        <Ionicons name="cube-outline" size={20} color={COLORS.primary[600]} />
      </View>
      
      <View style={styles.materialContent}>
        <Text style={[styles.materialName, compact && styles.materialNameCompact]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.materialDetails}>
          <Text style={styles.materialQuantity}>
            {item.quantity} {item.unit}
          </Text>
          {item.cost && (
            <Text style={styles.materialCost}>
              ₺{item.cost.toFixed(2)}
            </Text>
          )}
        </View>
        {item.category && !compact && (
          <Text style={styles.materialCategory}>{item.category}</Text>
        )}
      </View>
      
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
    </TouchableOpacity>
  );

  // ==================== RENDER ====================
  if (loading && materials.length === 0) {
    return (
      <View style={styles.container}>
        {showHeader && (
          <Text style={styles.headerTitle}>Kullanılan Malzemeler</Text>
        )}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (materials.length === 0) {
    return (
      <View style={styles.container}>
        {showHeader && (
          <Text style={styles.headerTitle}>Kullanılan Malzemeler</Text>
        )}
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={28} color={COLORS.gray[400]} />
          <Text style={styles.emptyText}>Bu iş için henüz malzeme kaydı girilmedi</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Kullanılan Malzemeler</Text>
          {materials.length > 0 && (
            <Text style={styles.headerSubtitle}>
              {materials.length} malzeme • Toplam: ₺{getTotalCost().toFixed(2)}
            </Text>
          )}
        </View>
      )}
      
      <View style={styles.materialsList}>
        {materials.map((material) => (
          <View key={material.id}>
            {renderMaterialItem({ item: material })}
          </View>
        ))}
      </View>
    </View>
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  materialsList: {
    gap: 8,
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
  },
  materialItemCompact: {
    padding: 8,
  },
  materialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  materialContent: {
    flex: 1,
  },
  materialName: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  materialNameCompact: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    marginBottom: 2,
  },
  materialDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  materialQuantity: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
  },
  materialCost: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
    color: COLORS.primary[600],
  },
  materialCategory: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[500],
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
});

export default MaterialsList;
