// 🚨 ARİZA DETAY - Tek arıza görüntüleme ve aksiyonlar (ata, başlat, tamamla, bakım oluştur)

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { IssueReport } from '../../types';
import { apiClient } from '../../services/api/client';
import { API_ENDPOINTS } from '../../constants';
import { COLORS, DIMENSIONS, STATUS_CONFIG } from '../../constants';
import { hapticFeedback } from '../../utils';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type DetailRouteProp = RouteProp<RootStackParamList, 'IssueDetail'>;

const IssueDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<DetailRouteProp>();
  const { issueId } = route.params;
  const [issue, setIssue] = useState<IssueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [employeesList, setEmployeesList] = useState<{ id: number; full_name: string; position_label?: string }[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  const loadIssue = useCallback(async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.ISSUE_DETAIL(issueId)) as { success?: boolean; data?: IssueReport };
      setIssue((res as any)?.data ?? null);
    } catch {
      setIssue(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [issueId]);

  useEffect(() => {
    loadIssue();
  }, [loadIssue]);

  const onRefresh = () => {
    setRefreshing(true);
    loadIssue();
  };

  const openAssignModal = useCallback(async () => {
    setAssignModalVisible(true);
    setEmployeesLoading(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.EMPLOYEES) as { data?: { id: number; full_name: string; position_label?: string }[] };
      const list = Array.isArray(res?.data) ? res.data : (res as any)?.data?.data ?? [];
      setEmployeesList(list);
    } catch {
      Alert.alert('Hata', 'Personel listesi yüklenemedi.');
      setAssignModalVisible(false);
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  const handleAssignTo = useCallback(async (employeeId: number) => {
    try {
      setActionLoading(true);
      await apiClient.post(API_ENDPOINTS.ISSUE_ASSIGN(issueId), { assigned_employee_id: employeeId });
      await hapticFeedback.success();
      setAssignModalVisible(false);
      loadIssue();
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message ?? 'Atama yapılamadı');
    } finally {
      setActionLoading(false);
    }
  }, [issueId, loadIssue]);

  const handleStartWork = async () => {
    try {
      setActionLoading(true);
      await apiClient.post(API_ENDPOINTS.ISSUE_START_WORK(issueId));
      await hapticFeedback.success();
      loadIssue();
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message ?? 'İşlem başarısız');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setActionLoading(true);
      await apiClient.post(API_ENDPOINTS.ISSUE_COMPLETE(issueId), {
        actual_completion_time: new Date().toISOString(),
      });
      await hapticFeedback.success();
      loadIssue();
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message ?? 'İşlem başarısız');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateMaintenance = async () => {
    if (issue?.maintenance_schedule_id) {
      navigation.navigate('MaintenanceDetail', { maintenanceId: issue.maintenance_schedule_id });
      return;
    }

    try {
      setActionLoading(true);
      const response = await apiClient.post(API_ENDPOINTS.ISSUE_CREATE_MAINTENANCE(issueId)) as {
        success?: boolean;
        data?: { maintenance_schedule_id?: number };
      };
      await hapticFeedback.success();
      const maintenanceId = response?.data?.maintenance_schedule_id;
      if (maintenanceId) {
        Alert.alert('Başarılı', 'Bakım kaydı hazır.', [
          {
            text: 'Aç',
            onPress: () => navigation.navigate('MaintenanceDetail', { maintenanceId }),
          },
          { text: 'Tamam' },
        ]);
      } else {
        Alert.alert('Başarılı', 'Bakım kaydı oluşturuldu.');
      }
      loadIssue();
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message ?? 'İşlem başarısız');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !issue) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  if (!issue) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Arıza bulunamadı.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Geri</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusConf = STATUS_CONFIG.issue[issue.status as keyof typeof STATUS_CONFIG.issue] || { label: issue.status, color: COLORS.gray[500] };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title={`Arıza #${issue.id}`}
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary[500]]} />}
      >
        <View style={[styles.statusBadge, { backgroundColor: statusConf.bgColor || COLORS.gray[100] }]}>
          <Text style={[styles.statusText, { color: statusConf.color }]}>{statusConf.label}</Text>
        </View>

        <Text style={styles.label}>Bina</Text>
        <Text style={styles.value}>{issue.building?.name ?? '-'}</Text>

        <Text style={styles.label}>Açıklama</Text>
        <Text style={styles.value}>{issue.description}</Text>

        <Text style={styles.label}>Öncelik</Text>
        <Text style={styles.value}>{issue.priority_label}</Text>

        {issue.assignedEmployee && (
          <>
            <Text style={styles.label}>Atanan</Text>
            <Text style={styles.value}>{issue.assignedEmployee.full_name}</Text>
          </>
        )}

        {issue.status !== 'tamamlandi' && issue.status !== 'iptal_edildi' && (
          <View style={styles.actions}>
            {!issue.assigned_employee_id && (
              <TouchableOpacity onPress={openAssignModal} style={styles.actionBtn} disabled={actionLoading}>
                <Ionicons name="person-add" size={20} color={COLORS.white} />
                <Text style={styles.actionBtnText}>Personel Ata</Text>
              </TouchableOpacity>
            )}
            {issue.assigned_employee_id && issue.status !== 'calisma_basladi' && (
              <TouchableOpacity onPress={handleStartWork} style={styles.actionBtn} disabled={actionLoading}>
                <Ionicons name="play" size={20} color={COLORS.white} />
                <Text style={styles.actionBtnText}>İşe Başla</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleCreateMaintenance} style={[styles.actionBtn, styles.actionBtnSecondary]} disabled={actionLoading}>
              <Ionicons name="construct" size={20} color={COLORS.primary[600]} />
              <Text style={[styles.actionBtnText, { color: COLORS.primary[600] }]}>
                {issue.maintenance_schedule_id ? 'Bakım Kaydını Aç' : 'Bakım Oluştur'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleComplete} style={[styles.actionBtn, styles.actionBtnSuccess]} disabled={actionLoading}>
              <Ionicons name="checkmark-done" size={20} color={COLORS.white} />
              <Text style={styles.actionBtnText}>Tamamla</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Personel Ata Modal */}
      <Modal visible={assignModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.assignModalContent}>
            <View style={styles.assignModalHeader}>
              <Text style={styles.assignModalTitle}>Personel Seç</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Ionicons name="close" size={28} color={COLORS.gray[700]} />
              </TouchableOpacity>
            </View>
            {employeesLoading ? (
              <View style={styles.assignModalLoading}>
                <ActivityIndicator size="large" color={COLORS.primary[500]} />
              </View>
            ) : (
              <FlatList
                data={employeesList}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.assignModalItem}
                    onPress={() => handleAssignTo(item.id)}
                    disabled={actionLoading}
                  >
                    <Text style={styles.assignModalItemName}>{item.full_name}</Text>
                    {item.position_label && <Text style={styles.assignModalItemPosition}>{item.position_label}</Text>}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.assignModalEmpty}>Personel bulunamadı</Text>}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: DIMENSIONS.FONT_SIZE.MD, color: COLORS.gray[600], marginBottom: 16 },
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
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 16 },
  statusText: { fontSize: DIMENSIONS.FONT_SIZE.SM, fontWeight: '600' },
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
  actionBtnSecondary: { backgroundColor: COLORS.primary[50] },
  actionBtnSuccess: { backgroundColor: COLORS.success[500] },
  actionBtnText: { color: COLORS.white, fontWeight: '600', fontSize: DIMENSIONS.FONT_SIZE.MD },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  assignModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  assignModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DIMENSIONS.SCREEN_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  assignModalTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: '700',
    color: COLORS.gray[900],
  },
  assignModalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  assignModalItem: {
    padding: DIMENSIONS.SCREEN_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  assignModalItemName: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  assignModalItemPosition: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginTop: 2,
  },
  assignModalEmpty: {
    padding: 24,
    textAlign: 'center',
    color: COLORS.gray[500],
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
  },
});

export default IssueDetailScreen;
