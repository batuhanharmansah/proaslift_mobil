import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import AppHeader from '../../components/navigation/AppHeader';
import { apiClient } from '../../services/api/client';
import { API_ENDPOINTS, COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback } from '../../utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const ChecklistSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [sections, setSections] = useState<Record<string, string>>({});
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [sectionId, setSectionId] = useState('machine_room');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CHECKLIST_SETTINGS) as {
        data?: { sections?: Record<string, string>; items?: any[] };
      };
      setSections(response?.data?.sections || {});
      setItems(response?.data?.items || []);
      if (response?.data?.sections) {
        const first = Object.keys(response.data.sections)[0];
        if (first) setSectionId(first);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
  }, [load]));

  const pickSection = useCallback(() => {
    const keys = Object.keys(sections);
    Alert.alert('Bölüm', '', keys.map((key) => ({
      text: sections[key],
      onPress: () => setSectionId(key),
    })));
  }, [sections]);

  const handleAdd = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Hata', 'Madde başlığı girin.');
      return;
    }
    setSaving(true);
    try {
      const response = await apiClient.post(API_ENDPOINTS.CHECKLIST_SETTINGS, {
        section_id: sectionId,
        title: title.trim(),
      }) as { success?: boolean; message?: string };
      if (response?.success) {
        setTitle('');
        await load();
      } else {
        Alert.alert('Hata', response?.message || 'Eklenemedi.');
      }
    } catch (err: any) {
      Alert.alert('Hata', err?.response?.data?.message || err?.message || 'Eklenemedi.');
    } finally {
      setSaving(false);
    }
  }, [title, sectionId, load]);

  const handleDelete = useCallback((item: any) => {
    Alert.alert('Maddeyi sil', item.title, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await hapticFeedback.medium();
            await apiClient.delete(`${API_ENDPOINTS.CHECKLIST_SETTINGS}/${item.id}`);
            await load();
          } catch (err: any) {
            Alert.alert('Hata', err?.response?.data?.message || err?.message || 'Silinemedi.');
          }
        },
      },
    ]);
  }, [load]);

  const grouped = items.reduce((acc: Record<string, any[]>, item) => {
    const key = item.section_id || 'other';
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader title="Kontrol Listesi" showBack onBackPress={() => navigation.goBack()} onMenuPress={() => setSidebarVisible(true)} />
      {loading ? (
        <View style={styles.centered}><LoadingSpinner size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await hapticFeedback.light(); await load(); }} />}
        >
          <Text style={styles.label}>Yeni madde</Text>
          <TouchableOpacity style={styles.picker} onPress={pickSection}>
            <Text>{sections[sectionId] || sectionId}</Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.gray[600]} />
          </TouchableOpacity>
          <TextInput style={styles.input} placeholder="Madde başlığı" placeholderTextColor={COLORS.gray[400]} value={title} onChangeText={setTitle} />
          <TouchableOpacity style={styles.btn} onPress={handleAdd} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Ekle</Text>}
          </TouchableOpacity>

          {Object.keys(grouped).map((key) => (
            <View key={key}>
              <Text style={styles.section}>{sections[key] || key}</Text>
              {grouped[key].map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <TouchableOpacity onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.error[600]} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 40 },
  label: { fontWeight: '600', color: COLORS.gray[700], marginBottom: 8 },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.gray[200], marginBottom: 10 },
  input: { backgroundColor: 'white', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.gray[200], marginBottom: 10 },
  btn: { backgroundColor: COLORS.primary[600], borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 20 },
  btnText: { color: 'white', fontWeight: '700' },
  section: { marginTop: 8, marginBottom: 8, fontWeight: '700', color: COLORS.gray[800] },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.gray[200], gap: 12 },
  itemTitle: { flex: 1, color: COLORS.gray[900] },
});

export default ChecklistSettingsScreen;
