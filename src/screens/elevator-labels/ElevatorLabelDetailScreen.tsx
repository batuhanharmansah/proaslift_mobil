// 🏷️ ETİKET DETAY - Tamamla, iptal (API hazır olduğunda aksiyonlar çalışır)

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
import { ElevatorLabel } from '../../types';
import { apiClient } from '../../services/api/client';
import { API_ENDPOINTS } from '../../constants';
import { COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback } from '../../utils';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';

type DetailRouteProp = RouteProp<RootStackParamList, 'ElevatorLabelDetail'>;

const ElevatorLabelDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<DetailRouteProp>();
  const { elevatorLabelId } = route.params;
  const [label, setLabel] = useState<ElevatorLabel | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const loadDetail = useCallback(async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.ELEVATOR_LABEL_DETAIL(elevatorLabelId)) as { success?: boolean; data?: ElevatorLabel };
      setLabel((res as any)?.data ?? null);
    } catch {
      setLabel(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [elevatorLabelId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDetail();
  };

  const handleComplete = async () => {
    try {
      setActionLoading(true);
      await apiClient.post(API_ENDPOINTS.ELEVATOR_LABEL_COMPLETE(elevatorLabelId));
      await hapticFeedback.success();
      loadDetail();
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message ?? 'İşlem başarısız');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert('İptal', 'Etiket kaydını iptal etmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal et',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(true);
            await apiClient.post(API_ENDPOINTS.ELEVATOR_LABEL_CANCEL(elevatorLabelId));
            await hapticFeedback.success();
            loadDetail();
          } catch (e: any) {
            Alert.alert('Hata', e?.response?.data?.message ?? 'İşlem başarısız');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  if (loading && !label) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  if (!label) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
        <AppHeader
          title="Etiket"
          showBack
          onBackPress={() => navigation.goBack()}
          onMenuPress={() => setSidebarVisible(true)}
        />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Etiket bulunamadı veya API henüz hazır değil.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Geri</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canComplete = label.status === 'aktif';
  const canCancel = label.status === 'aktif';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title={`Etiket #${label.id}`}
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary[500]]} />}
      >
        <View style={[styles.badge, { backgroundColor: COLORS.elevator[label.label_color] || COLORS.gray[300] }]}>
          <Text style={styles.badgeText}>{label.label_color_text}</Text>
        </View>

        <Text style={styles.label}>Bina</Text>
        <Text style={styles.value}>{label.building?.name ?? '-'}</Text>

        <Text style={styles.label}>Kontrol tarihi</Text>
        <Text style={styles.value}>{label.control_date}</Text>

        <Text style={styles.label}>Vade tarihi</Text>
        <Text style={styles.value}>{label.due_date ?? '-'}</Text>

        <Text style={styles.label}>Durum</Text>
        <Text style={styles.value}>{label.status_text}</Text>

        {canComplete && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleComplete} style={styles.actionBtn} disabled={actionLoading}>
              <Ionicons name="checkmark-done" size={20} color={COLORS.white} />
              <Text style={styles.actionBtnText}>Tamamlandı İşaretle</Text>
            </TouchableOpacity>
            {canCancel && (
              <TouchableOpacity onPress={handleCancel} style={[styles.actionBtn, styles.actionBtnSecondary]} disabled={actionLoading}>
                <Ionicons name="close" size={20} color={COLORS.gray[700]} />
                <Text style={[styles.actionBtnText, { color: COLORS.gray[700] }]}>İptal</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: DIMENSIONS.FONT_SIZE.MD, color: COLORS.gray[600], marginBottom: 16, textAlign: 'center' },
  backBtn: { padding: 12, backgroundColor: COLORS.primary[500], borderRadius: 8 },
  backBtnText: { color: COLORS.white, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: DIMENSIONS.FONT_SIZE.LG, fontWeight: '700', color: COLORS.gray[900] },
  scroll: { flex: 1 },
  scrollContent: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 40 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 16 },
  badgeText: { fontSize: DIMENSIONS.FONT_SIZE.SM, fontWeight: '600', color: COLORS.white },
  label: { fontSize: DIMENSIONS.FONT_SIZE.XS, color: COLORS.gray[500], marginTop: 12, marginBottom: 4 },
  value: { fontSize: DIMENSIONS.FONT_SIZE.MD, color: COLORS.gray[900] },
  actions: { marginTop: 24, gap: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    backgroundColor: COLORS.primary[500],
  },
  actionBtnSecondary: { backgroundColor: COLORS.gray[200] },
  actionBtnText: { color: COLORS.white, fontWeight: '600', fontSize: DIMENSIONS.FONT_SIZE.MD },
});

export default ElevatorLabelDetailScreen;
