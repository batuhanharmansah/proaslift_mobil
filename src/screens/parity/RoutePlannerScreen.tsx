import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import AppHeader from '../../components/navigation/AppHeader';
import { apiClient } from '../../services/api/client';
import { API_ENDPOINTS, COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback } from '../../utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';

const RoutePlannerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [jobs, setJobs] = useState<any[]>([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ROUTE_PLANNER) as { data?: { date?: string; jobs?: any[] } };
      setDate(response?.data?.date || '');
      setJobs(Array.isArray(response?.data?.jobs) ? response.data.jobs : []);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
  }, [load]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader title="Rota Planlayıcı" showBack onBackPress={() => navigation.goBack()} onMenuPress={() => setSidebarVisible(true)} />
      {loading && jobs.length === 0 ? (
        <View style={styles.centered}><LoadingSpinner size="large" /></View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await hapticFeedback.light(); await load(); }} />}
          ListHeaderComponent={<Text style={styles.date}>Tarih: {date || 'bugün'}</Text>}
          ListEmptyComponent={<EmptyState icon="map-outline" title="İş yok" subtitle="Bugün için planlı bakım bulunamadı." />}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                if (item.latitude && item.longitude) {
                  Linking.openURL(`https://maps.apple.com/?ll=${item.latitude},${item.longitude}&q=${encodeURIComponent(item.building_name || '')}`);
                }
              }}
            >
              <Text style={styles.order}>{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.building_name}</Text>
                <Text style={styles.sub}>{[item.district, item.address].filter(Boolean).join(' · ')}</Text>
                <Text style={styles.sub}>{item.status} · {item.priority}</Text>
              </View>
              {item.latitude ? <Ionicons name="navigate" size={18} color={COLORS.primary[600]} /> : null}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 32 },
  date: { marginBottom: 12, color: COLORS.gray[600], fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.gray[200] },
  order: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary[100], textAlign: 'center', lineHeight: 28, fontWeight: '700', color: COLORS.primary[700], overflow: 'hidden' },
  title: { fontWeight: '600', color: COLORS.gray[900] },
  sub: { color: COLORS.gray[500], fontSize: DIMENSIONS.FONT_SIZE.SM, marginTop: 2 },
});

export default RoutePlannerScreen;
