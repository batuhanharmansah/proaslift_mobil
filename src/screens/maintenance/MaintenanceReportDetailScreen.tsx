// 📋 MAINTENANCE REPORT DETAIL SCREEN
// Oluşturulmuş bakım raporunu görüntüleme (salt okunur)

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MaintenanceSchedule, MaintenanceReport } from '../../types';
import { COLORS } from '../../constants';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import { ROUTINE_CHECKLIST } from '../../constants/routineChecklist';

interface MaintenanceReportApi {
  id: number;
  start_time?: string | null;
  end_time?: string | null;
  work_description?: string | null;
  total_cost?: number | null;
  completion_status?: string | null;
  completion_percentage?: number | null;
  problems_found?: string | null;
  recommendations?: string | null;
  customer_name?: string | null;
  customer_notes?: string | null;
  approval_status?: 'onay_bekliyor' | 'onaylandi';
  approval_status_label?: string;
  approved_by_name?: string | null;
  approved_at?: string | null;
  routine_maintenance_checklist?: Record<string, Array<{ id: string; title: string; checked: boolean; has_error: boolean; notes: string }>> | null;
}

interface Props {
  route: {
    params: {
      maintenanceSchedule: MaintenanceSchedule;
      maintenanceReport: MaintenanceReportApi;
    };
  };
  navigation: any;
}

const statusLabels: Record<string, string> = {
  tamamlandi: 'Tamamlandı',
  kismi_tamamlandi: 'Kısmi Tamamlandı',
  ertelendi: 'Ertelendi',
};

const MaintenanceReportDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { maintenanceSchedule, maintenanceReport } = route.params ?? {};
  const isRoutine = (maintenanceSchedule?.maintenance_type ?? '') === 'rutin_bakim';
  const [sidebarVisible, setSidebarVisible] = React.useState(false);
  const checklist = maintenanceReport?.routine_maintenance_checklist ?? null;

  const formatDateTime = (s: string | null | undefined) => {
    if (!s) return '-';
    const d = new Date(s);
    return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title={isRoutine ? 'Rutin Bakım Raporu' : 'Bakım Raporu'}
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {maintenanceSchedule?.building?.name ?? 'Bina'} - {(maintenanceSchedule as any)?.maintenance_type_label ?? 'Bakım'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Çalışma Saatleri</Text>
          <Text style={styles.infoRow}>
            Başlangıç: {formatDateTime(maintenanceReport?.start_time ?? null)}
          </Text>
          <Text style={styles.infoRow}>
            Bitiş: {formatDateTime(maintenanceReport?.end_time ?? null)}
          </Text>
        </View>

        {maintenanceReport?.completion_status && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Durum</Text>
            <Text style={styles.infoRow}>
              {statusLabels[maintenanceReport.completion_status] ?? maintenanceReport.completion_status}
              {maintenanceReport.completion_percentage != null && ` (${maintenanceReport.completion_percentage}%)`}
            </Text>
          </View>
        )}

        {maintenanceReport?.work_description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yapılan İşler</Text>
            <Text style={styles.infoText}>{maintenanceReport.work_description}</Text>
          </View>
        )}

        {maintenanceReport?.problems_found && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tespit Edilen Sorunlar</Text>
            <Text style={styles.infoText}>{maintenanceReport.problems_found}</Text>
          </View>
        )}

        {maintenanceReport?.recommendations && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Öneriler</Text>
            <Text style={styles.infoText}>{maintenanceReport.recommendations}</Text>
          </View>
        )}

        {maintenanceReport?.approval_status && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bina Yöneticisi Onayı</Text>
            <Text style={[
              styles.approvalLabel,
              maintenanceReport.approval_status === 'onay_bekliyor' && styles.approvalPending,
            ]}>
              {maintenanceReport.approval_status_label || maintenanceReport.approval_status}
            </Text>
            {maintenanceReport.approved_by_name && (
              <Text style={styles.infoRow}>
                Onaylayan: {maintenanceReport.approved_by_name}
                {maintenanceReport.approved_at ? ` (${maintenanceReport.approved_at})` : ''}
              </Text>
            )}
          </View>
        )}

        {(maintenanceReport?.customer_name || maintenanceReport?.customer_notes) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Müşteri Bilgileri</Text>
            {maintenanceReport.customer_name && (
              <Text style={styles.infoRow}>Müşteri: {maintenanceReport.customer_name}</Text>
            )}
            {maintenanceReport.customer_notes && (
              <Text style={styles.infoText}>{maintenanceReport.customer_notes}</Text>
            )}
          </View>
        )}

        {maintenanceReport?.total_cost != null && maintenanceReport.total_cost > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Toplam Maliyet</Text>
            <Text style={styles.costText}>₺{(maintenanceReport.total_cost as number).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text>
          </View>
        )}

        {isRoutine && checklist && typeof checklist === 'object' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kontrol Listesi</Text>
            {ROUTINE_CHECKLIST.map(section => {
              const items = checklist[section.id] ?? [];
              if (items.length === 0) return null;
              return (
                <View key={section.id} style={styles.checklistSection}>
                  <Text style={styles.checklistSectionTitle}>{section.icon} {section.title}</Text>
                  {items.map((item: { id: string; title: string; checked: boolean; has_error: boolean; notes: string }) => (
                    <View key={item.id} style={styles.checklistItem}>
                      <Text style={styles.checklistItemIcon}>
                        {item.has_error ? '❌' : item.checked ? '✅' : '○'}
                      </Text>
                      <View style={styles.checklistItemContent}>
                        <Text style={styles.checklistItemTitle}>{item.title}</Text>
                        {item.has_error && item.notes && (
                          <Text style={styles.checklistItemNotes}>{item.notes}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.gray[900] },
  headerRight: { width: 32 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.gray[900] },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.gray[700], marginBottom: 8 },
  approvalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.success[700] },
  approvalPending: { color: COLORS.warning[700] },
  infoRow: { fontSize: 14, color: COLORS.gray[800], marginBottom: 4 },
  infoText: { fontSize: 14, color: COLORS.gray[800], lineHeight: 20 },
  costText: { fontSize: 18, fontWeight: '700', color: COLORS.primary[600] },
  checklistSection: { marginBottom: 16 },
  checklistSectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.gray[700], marginBottom: 8 },
  checklistItem: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
  checklistItemIcon: { fontSize: 16, marginRight: 8, marginTop: 2 },
  checklistItemContent: { flex: 1 },
  checklistItemTitle: { fontSize: 13, color: COLORS.gray[800] },
  checklistItemNotes: { fontSize: 12, color: COLORS.gray[600], marginTop: 2, fontStyle: 'italic' },
});

export default MaintenanceReportDetailScreen;
