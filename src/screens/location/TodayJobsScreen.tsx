// 📅 TODAY JOBS SCREEN - Bugünün İşleri Ekranı (Admin Tarafı)
// Bugünün bakım işlerini listeler (HARITA YOK, sadece liste)

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { MaintenanceScheduleWithLocation, MapData } from '../../types';
import { locationApi } from '../../services/api/locationApi';
import { COLORS, DIMENSIONS, STATUS_CONFIG, PRIORITY_CONFIG } from '../../constants';
import { hapticFeedback } from '../../utils';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';

interface Props {
  navigation: any;
}

const TodayJobsScreen: React.FC<Props> = ({ navigation }) => {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Bugünün tarihini YYYY-MM-DD formatında al
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // ==================== Harita Verilerini Yükle ====================
  const loadMapData = async () => {
    try {
      setIsLoading(true);
      const data = await locationApi.getMapData(selectedDate);
      setMapData(data);
    } catch (error: any) {
      console.error('Load map data error:', error);
      Alert.alert('Hata', error.message || 'Veriler yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== Sayfa Odaklandığında ====================
  useFocusEffect(
    useCallback(() => {
      loadMapData();

      // Her 30 saniyede bir otomatik yenile
      const interval = setInterval(() => {
        loadMapData();
      }, 30000);

      return () => clearInterval(interval);
    }, [selectedDate])
  );

  // ==================== Yenileme ====================
  const handleRefresh = async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    
    try {
      await loadMapData();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // ==================== Tarih Formatla ====================
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // ==================== Bugün mü kontrolü ====================
  const isToday = (dateString: string): boolean => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateString === todayStr;
  };

  // ==================== İş Detayına Git ====================
  const handleJobPress = (schedule: MaintenanceScheduleWithLocation) => {
    hapticFeedback.light();
    // Maintenance detail screen'e git
    navigation.navigate('MaintenanceDetail', { 
      maintenanceId: schedule.id 
    });
  };

  // ==================== Marker Renk Al ====================
  const getScheduleColor = (status: string): string => {
    switch (status) {
      case 'planli':
      case 'atandi':
        return COLORS.primary[500]; // Mor/Purple
      case 'baslandi':
        return COLORS.blue[500]; // Mavi/Blue
      case 'tamamlandi':
        return COLORS.success[500]; // Yeşil/Green
      case 'ertelendi':
        return COLORS.warning[500]; // Sarı/Yellow
      default:
        return COLORS.gray[500]; // Gri/Gray
    }
  };

  // ==================== Süreyi Formatla ====================
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours} saat ${mins} dakika`;
    } else if (hours > 0) {
      return `${hours} saat`;
    } else {
      return `${mins} dakika`;
    }
  };

  // ==================== İş Kartı Render ====================
  const renderJobCard = ({ item: schedule }: { item: MaintenanceScheduleWithLocation }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => handleJobPress(schedule)}
      activeOpacity={0.7}
    >
      {/* Status Indicator */}
      <View style={[
        styles.statusIndicator,
        { backgroundColor: getScheduleColor(schedule.status) }
      ]} />

      <View style={styles.jobCardContent}>
        {/* Header */}
        <View style={styles.jobHeader}>
          <Text style={styles.jobType}>{schedule.maintenance_type_label}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: STATUS_CONFIG.maintenance[schedule.status]?.bgColor || COLORS.gray[50] }
          ]}>
            <Text style={[
              styles.statusText,
              { color: STATUS_CONFIG.maintenance[schedule.status]?.color || COLORS.gray[700] }
            ]}>
              {schedule.status_label}
            </Text>
          </View>
        </View>

        {/* Bina Bilgileri */}
        <View style={styles.buildingInfo}>
          <Ionicons name="business-outline" size={16} color={COLORS.gray[600]} />
          <Text style={styles.buildingName}>{schedule.building?.name || 'Bilinmiyor'}</Text>
        </View>

        <Text style={styles.buildingAddress} numberOfLines={2}>
          {schedule.building?.address || 'Adres belirtilmemiş'}
        </Text>

        {/* Çalışan Bilgisi */}
        {schedule.assigned_employee ? (
          <View style={styles.employeeInfo}>
            <Ionicons name="person-outline" size={16} color={COLORS.gray[600]} />
            <Text style={styles.employeeName}>{schedule.assigned_employee.name}</Text>
            {schedule.assigned_employee.phone && (
              <>
                <Ionicons name="call-outline" size={14} color={COLORS.gray[500]} style={styles.phoneIcon} />
                <Text style={styles.employeePhone}>{schedule.assigned_employee.phone}</Text>
              </>
            )}
          </View>
        ) : (
          <View style={styles.employeeInfo}>
            <Ionicons name="warning-outline" size={16} color={COLORS.warning[500]} />
            <Text style={styles.noEmployee}>Atanan çalışan yok</Text>
          </View>
        )}

        {/* Zaman Bilgileri */}
        <View style={styles.timeInfo}>
          {schedule.scheduled_time_display && (
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.gray[600]} />
              <Text style={styles.timeText}>Gidiş: {schedule.scheduled_time_display}</Text>
            </View>
          )}
          
          {schedule.estimated_duration && (
            <View style={styles.timeRow}>
              <Ionicons name="hourglass-outline" size={16} color={COLORS.gray[600]} />
              <Text style={styles.timeText}>
                Süre: {formatDuration(schedule.estimated_duration)}
              </Text>
            </View>
          )}
          
          {schedule.estimated_end_time && (
            <View style={styles.timeRow}>
              <Ionicons name="stopwatch-outline" size={16} color={COLORS.gray[600]} />
              <Text style={styles.timeText}>
                Bitiş: {schedule.estimated_end_time.split(' ')[1]?.substring(0, 5) || ''}
              </Text>
            </View>
          )}
        </View>

        {/* Öncelik */}
        <View style={styles.priorityRow}>
          <View style={[
            styles.priorityBadge,
            { backgroundColor: PRIORITY_CONFIG[schedule.priority]?.bgColor || COLORS.gray[50] }
          ]}>
            <Text style={[
              styles.priorityText,
              { color: PRIORITY_CONFIG[schedule.priority]?.color || COLORS.gray[700] }
            ]}>
              {schedule.priority_label}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ==================== İstatistikler ====================
  const stats = {
    total: mapData?.today_schedules.length || 0,
    completed: mapData?.today_schedules.filter(s => s.status === 'tamamlandi').length || 0,
    inProgress: mapData?.today_schedules.filter(s => s.status === 'baslandi').length || 0,
    assigned: mapData?.today_schedules.filter(s => s.status === 'atandi' || s.status === 'planli').length || 0,
    activeEmployees: mapData?.employees.length || 0,
  };

  // ==================== Görünüm ====================
  return (
    <View style={styles.container}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title={isToday(selectedDate) ? `Bugünün İşleri · ${formatDate(selectedDate)}` : `Bakım İşleri · ${formatDate(selectedDate)}`}
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
        rightElement={
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        }
      />

      {/* İstatistikler */}
      <ScrollView 
        horizontal 
        style={styles.statsContainer}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Toplam İş</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.success[50] }]}>
          <Text style={[styles.statValue, { color: COLORS.success[600] }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Tamamlandı</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.blue[100] }]}>
          <Text style={[styles.statValue, { color: COLORS.blue[500] }]}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>Devam Ediyor</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.primary[50] }]}>
          <Text style={[styles.statValue, { color: COLORS.primary[600] }]}>{stats.assigned}</Text>
          <Text style={styles.statLabel}>Atandı</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.success[50] }]}>
          <Text style={[styles.statValue, { color: COLORS.success[600] }]}>{stats.activeEmployees}</Text>
          <Text style={styles.statLabel}>Sahada Çalışan</Text>
        </View>
      </ScrollView>

      {/* İş Listesi */}
      {isLoading && !refreshing && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      )}

      {!isLoading && mapData && mapData.today_schedules.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={COLORS.gray[400]} />
          <Text style={styles.emptyText}>Bu tarihte planlanan iş yok</Text>
        </View>
      )}

      {mapData && mapData.today_schedules.length > 0 && (
        <FlatList
          data={mapData.today_schedules}
          renderItem={renderJobCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          // Performance optimizations
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={(data, index) => ({
            length: 180, // Approximate item height
            offset: 180 * index,
            index,
          })}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DIMENSIONS.SCREEN_PADDING,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  headerDate: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginTop: 4,
  },
  refreshButton: {
    padding: 8,
  },
  statsContainer: {
    paddingVertical: 12,
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    backgroundColor: 'white',
  },
  statCard: {
    backgroundColor: COLORS.primary[50],
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  statValue: {
    fontSize: DIMENSIONS.FONT_SIZE.XXL,
    fontWeight: 'bold',
    color: COLORS.primary[600],
  },
  statLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
    marginTop: 4,
  },
  listContainer: {
    padding: DIMENSIONS.SCREEN_PADDING,
  },
  jobCard: {
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    ...DIMENSIONS.SHADOW_MD,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  statusIndicator: {
    width: 4,
    backgroundColor: COLORS.primary[500],
  },
  jobCardContent: {
    flex: 1,
    padding: DIMENSIONS.CARD_PADDING,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobType: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: '600',
    color: COLORS.gray[900],
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
  },
  buildingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  buildingName: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '500',
    color: COLORS.gray[900],
    flex: 1,
  },
  buildingAddress: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginBottom: 8,
    marginLeft: 24,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  employeeName: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[700],
    flex: 1,
  },
  phoneIcon: {
    marginLeft: 8,
  },
  employeePhone: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
  },
  noEmployee: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.warning[600],
    fontStyle: 'italic',
  },
  timeInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    gap: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[700],
  },
  priorityRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[600],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[500],
    marginTop: 16,
  },
});

export default TodayJobsScreen;