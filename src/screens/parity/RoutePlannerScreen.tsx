import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import AppHeader from '../../components/navigation/AppHeader';
import { apiClient } from '../../services/api/client';
import { API_ENDPOINTS, COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback } from '../../utils';
import { locationService } from '../../services/location/LocationService';
import { useAuth } from '../../store/authStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';

type Origin = { latitude: number; longitude: number; label: string } | null;

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const RoutePlannerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [origin, setOrigin] = useState<Origin>(null);
  const [originLoading, setOriginLoading] = useState<'gps' | 'shop' | null>(null);

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

  const useMyLocation = useCallback(async () => {
    setOriginLoading('gps');
    await hapticFeedback.light();
    const location = await locationService.getCurrentLocation();
    setOriginLoading(null);
    if (!location) {
      Alert.alert('Konum Alınamadı', 'Konum izninizi kontrol edip tekrar deneyin.');
      return;
    }
    setOrigin({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      label: 'Konumum',
    });
  }, []);

  const useShopLocation = useCallback(async () => {
    const address = user?.company?.address;
    if (!address) {
      Alert.alert('Depo Adresi Yok', 'Firma profilinde kayıtlı bir adres bulunamadı.');
      return;
    }
    setOriginLoading('shop');
    await hapticFeedback.light();
    try {
      const results = await Location.geocodeAsync(address);
      if (!results || results.length === 0) {
        Alert.alert('Adres Bulunamadı', 'Depo adresi haritada bulunamadı. Lütfen firma profilindeki adresi kontrol edin.');
        return;
      }
      setOrigin({ latitude: results[0].latitude, longitude: results[0].longitude, label: 'Depo' });
    } catch {
      Alert.alert('Hata', 'Depo adresi konuma çevrilemedi.');
    } finally {
      setOriginLoading(null);
    }
  }, [user?.company?.address]);

  // Başlangıç noktası seçiliyse işleri en yakın komşu (nearest neighbor) sırasına göre diz
  const orderedJobs = React.useMemo(() => {
    const withCoords = jobs.filter((j) => j.latitude && j.longitude);
    if (!origin || withCoords.length === 0) return jobs;

    const remaining = [...withCoords];
    const ordered: any[] = [];
    let current = { latitude: origin.latitude, longitude: origin.longitude };
    while (remaining.length > 0) {
      remaining.sort(
        (a, b) =>
          distanceKm(current.latitude, current.longitude, a.latitude, a.longitude) -
          distanceKm(current.latitude, current.longitude, b.latitude, b.longitude)
      );
      const next = remaining.shift();
      if (!next) break;
      ordered.push(next);
      current = { latitude: next.latitude, longitude: next.longitude };
    }
    const withoutCoords = jobs.filter((j) => !j.latitude || !j.longitude);
    return [...ordered, ...withoutCoords];
  }, [jobs, origin]);

  const openFullRoute = useCallback(() => {
    const points = orderedJobs.filter((j) => j.latitude && j.longitude);
    if (points.length === 0) {
      Alert.alert('Bina Yok', 'Rota oluşturmak için konumu bilinen en az bir bina gerekiyor.');
      return;
    }
    const coords = points.map((j) => `${j.latitude},${j.longitude}`);
    const originStr = origin ? `${origin.latitude},${origin.longitude}` : coords[0];
    const destination = coords[coords.length - 1];
    const waypoints = coords.slice(origin ? 0 : 1, -1).join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destination}`;
    if (waypoints) url += `&waypoints=${waypoints}`;
    Linking.openURL(url);
  }, [orderedJobs, origin]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader title="Rota Planlayıcı" showBack onBackPress={() => navigation.goBack()} onMenuPress={() => setSidebarVisible(true)} />

      <View style={styles.originBar}>
        <TouchableOpacity
          style={[styles.originButton, origin?.label === 'Konumum' && styles.originButtonActive]}
          onPress={useMyLocation}
          disabled={originLoading !== null}
        >
          {originLoading === 'gps' ? (
            <ActivityIndicator size="small" color={COLORS.primary[700]} />
          ) : (
            <Ionicons name="navigate" size={16} color={origin?.label === 'Konumum' ? COLORS.primary[700] : COLORS.gray[600]} />
          )}
          <Text style={[styles.originButtonText, origin?.label === 'Konumum' && styles.originButtonTextActive]}>Konumumdan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.originButton, origin?.label === 'Depo' && styles.originButtonActive]}
          onPress={useShopLocation}
          disabled={originLoading !== null}
        >
          {originLoading === 'shop' ? (
            <ActivityIndicator size="small" color={COLORS.primary[700]} />
          ) : (
            <Ionicons name="business" size={16} color={origin?.label === 'Depo' ? COLORS.primary[700] : COLORS.gray[600]} />
          )}
          <Text style={[styles.originButtonText, origin?.label === 'Depo' && styles.originButtonTextActive]}>Depodan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.routeButton} onPress={openFullRoute}>
          <Ionicons name="map" size={16} color="white" />
          <Text style={styles.routeButtonText}>Rota</Text>
        </TouchableOpacity>
      </View>
      {origin ? (
        <Text style={styles.originInfo}>Başlangıç: {origin.label} — binalar buna göre en yakından uzağa sıralandı.</Text>
      ) : null}

      {loading && jobs.length === 0 ? (
        <View style={styles.centered}><LoadingSpinner size="large" /></View>
      ) : (
        <FlatList
          data={orderedJobs}
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
                  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`);
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
  originBar: { flexDirection: 'row', gap: 8, paddingHorizontal: DIMENSIONS.SCREEN_PADDING, paddingTop: 10, paddingBottom: 4 },
  originButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'white', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.gray[200] },
  originButtonActive: { backgroundColor: COLORS.primary[50], borderColor: COLORS.primary[300] },
  originButtonText: { fontSize: DIMENSIONS.FONT_SIZE.SM, color: COLORS.gray[600], fontWeight: '600' },
  originButtonTextActive: { color: COLORS.primary[700] },
  routeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary[600], borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginLeft: 'auto' },
  routeButtonText: { color: 'white', fontSize: DIMENSIONS.FONT_SIZE.SM, fontWeight: '700' },
  originInfo: { paddingHorizontal: DIMENSIONS.SCREEN_PADDING, color: COLORS.gray[500], fontSize: DIMENSIONS.FONT_SIZE.XS, marginBottom: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.gray[200] },
  order: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary[100], textAlign: 'center', lineHeight: 28, fontWeight: '700', color: COLORS.primary[700], overflow: 'hidden' },
  title: { fontWeight: '600', color: COLORS.gray[900] },
  sub: { color: COLORS.gray[500], fontSize: DIMENSIONS.FONT_SIZE.SM, marginTop: 2 },
});

export default RoutePlannerScreen;
