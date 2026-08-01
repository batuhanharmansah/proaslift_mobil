// 📅 TODAY'S JOBS WIDGET
// Bugünün bakım işlerini listeler

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { COLORS, DIMENSIONS, API_ENDPOINTS } from '../../constants';
import { apiClient } from '../../services/api/client';
import { hapticFeedback, formatDate } from '../../utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface TodayJob {
  id: number;
  building_id: number;
  building_name?: string;
  building_address?: string;
  building?: {
    id: number;
    name: string;
    address?: string;
  };
  maintenance_type: string;
  maintenance_type_label: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: string;
  status_label: string;
  priority: string;
  priority_label?: string;
  description?: string;
  assigned_employee_id?: number;
  assigned_employee_name?: string;
  assigned_employee?: {
    id: number;
    first_name: string;
    last_name: string;
    full_name?: string;
  };
}

interface TodayJobsWidgetProps {
  limit?: number;
  showHeader?: boolean;
  onPress?: () => void;
}

const TodayJobsWidget: React.FC<TodayJobsWidgetProps> = ({
  limit = 5,
  showHeader = true,
  onPress,
}) => {
  // ==================== STATE ====================
  const [jobs, setJobs] = useState<TodayJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();

  // ==================== FETCH DATA ====================
  const fetchTodayJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(API_ENDPOINTS.MAINTENANCE_SCHEDULES, {
        params: {
          range: 'today',
          per_page: limit,
          sort_by: 'scheduled_time',
          sort_order: 'asc',
        },
      });

      // Backend'den { success: true, data: { data: [...], pagination: {...} } } formatında geliyor
      const jobsData = response.data.data?.data || response.data.data || [];
      setJobs(Array.isArray(jobsData) ? jobsData.slice(0, limit) : []);
    } catch (err: any) {
      console.error('❌ Today jobs fetch error:', err);
      setError(err.message || 'Bugünün işleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchTodayJobs();
  }, [fetchTodayJobs]);

  // ==================== HANDLERS ====================
  const handleJobPress = useCallback(async (job: TodayJob) => {
    await hapticFeedback.light();
    if (onPress) {
      onPress();
    } else {
      // Navigate to maintenance screen
      navigation.navigate('Maintenance' as any);
    }
  }, [navigation, onPress]);

  const handleViewAll = useCallback(async () => {
    await hapticFeedback.light();
    navigation.navigate('Maintenance', { initialFilter: 'today' });
  }, [navigation]);

  // ==================== RENDER ====================
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'acil':
        return COLORS.error[500];
      case 'yuksek':
        return COLORS.warning[600];
      case 'normal':
        return COLORS.primary[500];
      case 'dusuk':
        return COLORS.gray[400];
      default:
        return COLORS.gray[500];
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'tamamlandi':
        return COLORS.success[500];
      case 'baslandi':
        return COLORS.warning[500];
      case 'atandi':
      case 'planli':
        return COLORS.primary[500];
      default:
        return COLORS.gray[500];
    }
  };

  const renderJobItem = ({ item }: { item: TodayJob }) => {
    const buildingName = item.building_name || item.building?.name || 'Bilinmeyen Bina';
    const employeeName = item.assigned_employee_name || 
      (item.assigned_employee ? `${item.assigned_employee.first_name} ${item.assigned_employee.last_name}` : null);

    return (
      <TouchableOpacity
        style={styles.jobItem}
        onPress={() => handleJobPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.jobHeader}>
          <View style={styles.jobTitleRow}>
            <Ionicons
              name="construct"
              size={18}
              color={getStatusColor(item.status)}
              style={styles.jobIcon}
            />
            <Text style={styles.jobBuilding} numberOfLines={1}>
              {buildingName}
            </Text>
          </View>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority_label || item.priority}
          </Text>
        </View>
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.jobDetailRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.jobDetailText}>
            {item.scheduled_time || 'Saat belirtilmemiş'}
          </Text>
        </View>
        <View style={styles.jobDetailRow}>
          <Ionicons name="document-text-outline" size={14} color={COLORS.gray[500]} />
          <Text style={styles.jobDetailText} numberOfLines={1}>
            {item.maintenance_type_label}
          </Text>
        </View>
      </View>

      {employeeName && (
        <View style={styles.assignedEmployee}>
          <Ionicons name="person-outline" size={14} color={COLORS.primary[500]} />
          <Text style={styles.assignedEmployeeText}>{employeeName}</Text>
        </View>
      )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.gray[300]} />
      <Text style={styles.emptyText}>Bugün için iş bulunmuyor</Text>
    </View>
  );

  if (loading && jobs.length === 0) {
    return (
      <View style={styles.container}>
        {showHeader && (
          <View style={styles.header}>
            <Text style={styles.title}>Günün İşleri</Text>
          </View>
        )}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.primary[500]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>Günün İşleri</Text>
          {jobs.length > 0 && (
            <TouchableOpacity onPress={handleViewAll}>
              <Text style={styles.viewAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color={COLORS.error[500]} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : jobs.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: DIMENSIONS.SCREEN_PADDING,
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
  },
  title: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  viewAllText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[500],
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.error[50],
    borderRadius: 8,
  },
  errorText: {
    marginLeft: 8,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.error[600],
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 12,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[500],
  },
  jobItem: {
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary[500],
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobIcon: {
    marginRight: 8,
  },
  jobBuilding: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
  },
  jobDetails: {
    marginTop: 4,
  },
  jobDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  jobDetailText: {
    marginLeft: 6,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    flex: 1,
  },
  assignedEmployee: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  assignedEmployeeText: {
    marginLeft: 6,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[600],
    fontWeight: '500',
  },
});

export default TodayJobsWidget;
