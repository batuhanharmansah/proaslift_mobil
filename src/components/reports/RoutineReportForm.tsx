// Rutin Bakım Raporu - Checklist formu (Web ile uyumlu)
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import { ROUTINE_CHECKLIST } from '../../constants/routineChecklist';
import { COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback } from '../../utils';
import { formatTime } from '../../utils/dateUtils';

export interface ChecklistItemState {
  id: string;
  title: string;
  checked: boolean;
  has_error: boolean;
  notes: string;
}

export interface RoutineReportFormData {
  start_time: string;
  end_time?: string;
  recommendations: string;
  completion_status: 'tamamlandi' | 'kismi_tamamlandi' | 'ertelendi';
  customer_name: string;
  customer_notes: string;
  routine_maintenance_checklist: Record<string, ChecklistItemState[]>;
  completion_percentage: number;
}

const initialChecklist = (): Record<string, ChecklistItemState[]> => {
  const out: Record<string, ChecklistItemState[]> = {};
  ROUTINE_CHECKLIST.forEach(sec => {
    out[sec.id] = sec.items.map(i => ({ id: i.id, title: i.title, checked: false, has_error: false, notes: '' }));
  });
  return out;
};

interface Props {
  maintenanceSchedule: { building?: { name?: string }; maintenance_type_label?: string };
  onSubmit: (data: RoutineReportFormData) => Promise<void>;
}

const RoutineReportForm: React.FC<Props> = ({ maintenanceSchedule, onSubmit }) => {
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState<Date | null>(null);

  const mergeTimeWithToday = (d: Date): Date => {
    const today = new Date();
    today.setHours(d.getHours(), d.getMinutes(), 0, 0);
    return today;
  };
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [recommendations, setRecommendations] = useState('');
  const [completionStatus, setCompletionStatus] = useState<'tamamlandi' | 'kismi_tamamlandi' | 'ertelendi'>('tamamlandi');
  const [customerName, setCustomerName] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [checklist, setChecklist] = useState(initialChecklist);
  const [submitting, setSubmitting] = useState(false);

  const toggleCheck = useCallback((section: string, itemId: string) => {
    setChecklist(prev => {
      const sec = [...(prev[section] || [])];
      const idx = sec.findIndex(i => i.id === itemId);
      if (idx < 0) return prev;
      const item = sec[idx];
      if (item.has_error) return prev;
      sec[idx] = { ...item, checked: !item.checked, notes: item.checked ? '' : item.notes };
      return { ...prev, [section]: sec };
    });
  }, []);

  const toggleError = useCallback((section: string, itemId: string) => {
    hapticFeedback.light();
    setChecklist(prev => {
      const sec = [...(prev[section] || [])];
      const idx = sec.findIndex(i => i.id === itemId);
      if (idx < 0) return prev;
      const item = sec[idx];
      const newError = !item.has_error;
      sec[idx] = { ...item, has_error: newError, checked: newError ? false : item.checked, notes: '' };
      return { ...prev, [section]: sec };
    });
  }, []);

  const totalItems = ROUTINE_CHECKLIST.reduce((sum, s) => sum + s.items.length, 0);
  const checkedItems = Object.values(checklist).flat().filter(i => i.checked).length;
  const completionPercentage = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        start_time: startTime.toISOString(),
        end_time: endTime?.toISOString() ?? undefined,
        recommendations,
        completion_status: completionStatus,
        customer_name: customerName,
        customer_notes: customerNotes,
        routine_maintenance_checklist: checklist,
        completion_percentage: completionPercentage,
      });
    } finally {
      setSubmitting(false);
    }
  }, [startTime, endTime, recommendations, completionStatus, customerName, customerNotes, checklist, completionPercentage, onSubmit]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.progressCard}>
        <Text style={styles.progressLabel}>Tamamlanma</Text>
        <Text style={styles.progressValue}>{completionPercentage}%</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
        </View>
      </View>

      {ROUTINE_CHECKLIST.map(section => {
        const items = checklist[section.id] || [];
        const checked = items.filter(i => i.checked).length;
        return (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.icon} {section.title}</Text>
              <Text style={styles.sectionCount}>{checked}/{section.items.length}</Text>
            </View>
            {items.map(item => (
              <View key={item.id} style={[styles.checkItem, item.has_error && styles.checkItemError]}>
                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => !item.has_error && (hapticFeedback.light(), toggleCheck(section.id, item.id))}
                  disabled={item.has_error}
                >
                  <View style={[styles.checkbox, item.checked && styles.checkboxChecked, item.has_error && styles.checkboxError]}>
                    {item.checked && !item.has_error && <Ionicons name="checkmark" size={16} color="white" />}
                    {item.has_error && <Ionicons name="close" size={16} color="white" />}
                  </View>
                  <Text style={[styles.checkLabel, item.checked && !item.has_error && styles.checkLabelDone]} numberOfLines={2}>{item.title}</Text>
                  <TouchableOpacity style={[styles.errorBtn, item.has_error && styles.errorBtnActive]} onPress={() => toggleError(section.id, item.id)}>
                    <Ionicons name="close-circle" size={24} color={item.has_error ? COLORS.error[600] : COLORS.error[500]} />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );
      })}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Çalışma Saatleri</Text>
        <TouchableOpacity style={styles.timeBtn} onPress={() => setShowStart(true)}>
          <Ionicons name="time-outline" size={20} color={COLORS.primary[600]} />
          <Text style={styles.timeText}>Başlangıç: {formatTime(startTime)}</Text>
        </TouchableOpacity>
        {showStart && (
          <DateTimePicker value={startTime} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} locale="tr-TR"
            onChange={(_, d) => { setShowStart(Platform.OS === 'ios'); if (d) setStartTime(mergeTimeWithToday(d)); }} />
        )}
        <TouchableOpacity style={styles.timeBtn} onPress={() => setShowEnd(true)}>
          <Ionicons name="time-outline" size={20} color={COLORS.gray[600]} />
          <Text style={[styles.timeText, !endTime && styles.timePlaceholder]}>Bitiş: {endTime ? formatTime(endTime) : 'Seçiniz'}</Text>
        </TouchableOpacity>
        {showEnd && (
          <DateTimePicker value={endTime || startTime} mode="time" is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} locale="tr-TR"
            onChange={(_, d) => { setShowEnd(Platform.OS === 'ios'); if (d) setEndTime(mergeTimeWithToday(d)); }} />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Genel Notlar</Text>
        <TextInput style={styles.textArea} placeholder="Notlar, öneriler..." value={recommendations} onChangeText={setRecommendations} multiline numberOfLines={4} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tamamlanma Durumu</Text>
        {(['tamamlandi', 'kismi_tamamlandi', 'ertelendi'] as const).map(s => (
          <TouchableOpacity key={s} style={[styles.statusBtn, completionStatus === s && styles.statusBtnActive]} onPress={() => setCompletionStatus(s)}>
            <Text style={[styles.statusText, completionStatus === s && styles.statusTextActive]}>
              {s === 'tamamlandi' && '✅ Tamamlandı'}{s === 'kismi_tamamlandi' && '⏳ Kısmi'}{s === 'ertelendi' && '⏸️ Ertelendi'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Müşteri Bilgileri</Text>
        <TextInput style={styles.input} placeholder="Müşteri adı" value={customerName} onChangeText={setCustomerName} />
        <TextInput style={styles.textArea} placeholder="Müşteri notları" value={customerNotes} onChangeText={setCustomerNotes} multiline numberOfLines={3} />
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>📤 Rutin Bakım Raporunu Kaydet</Text>}
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  progressCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 },
  progressLabel: { fontSize: 14, color: COLORS.gray[600] },
  progressValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.success[600] },
  progressBar: { height: 8, backgroundColor: COLORS.gray[200], borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.success[500], borderRadius: 4 },
  section: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.gray[900] },
  sectionCount: { fontSize: 12, color: COLORS.success[600], fontWeight: '600' },
  checkItem: { marginBottom: 8, borderWidth: 1, borderColor: COLORS.gray[200], borderRadius: 8, padding: 12 },
  checkItemError: { borderColor: COLORS.error[500], backgroundColor: COLORS.error[50] },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.gray[400], justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: COLORS.success[500], borderColor: COLORS.success[500] },
  checkboxError: { backgroundColor: COLORS.error[500], borderColor: COLORS.error[500] },
  checkLabel: { flex: 1, fontSize: 13, color: COLORS.gray[800] },
  checkLabelDone: { textDecorationLine: 'line-through', color: COLORS.gray[500] },
  errorBtn: { padding: 4 },
  errorBtnActive: { backgroundColor: COLORS.error[100], borderRadius: 12 },
  timeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: COLORS.gray[50], borderRadius: 8, marginBottom: 8 },
  timeText: { fontSize: 14, color: COLORS.gray[900] },
  timePlaceholder: { color: COLORS.gray[500] },
  textArea: { borderWidth: 1, borderColor: COLORS.gray[200], borderRadius: 8, padding: 12, fontSize: 14, minHeight: 80 },
  input: { borderWidth: 1, borderColor: COLORS.gray[200], borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 8 },
  statusBtn: { padding: 12, borderWidth: 1, borderColor: COLORS.gray[300], borderRadius: 8, marginBottom: 8 },
  statusBtnActive: { borderColor: COLORS.primary[500], backgroundColor: COLORS.primary[50] },
  statusText: { fontSize: 14, color: COLORS.gray[700] },
  statusTextActive: { color: COLORS.primary[700], fontWeight: '600' },
  submitBtn: { backgroundColor: COLORS.success[600], padding: 16, borderRadius: 12, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});

export default RoutineReportForm;
