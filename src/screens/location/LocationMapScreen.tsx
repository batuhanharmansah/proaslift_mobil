import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import AppHeader from '../../components/navigation/AppHeader';
import { locationApi } from '../../services/api/locationApi';
import { MapData } from '../../types';
import { COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback } from '../../utils';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const openMaps = (lat: number, lng: number, label: string) => {
  const url = `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(label)}`;
  Linking.openURL(url);
};

const LocationMapScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await locationApi.getMapData();
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    load();
  }, [load]));

  const buildings = data?.buildings || [];
  const missing = data?.buildings_without_coordinates || [];
  const employees = data?.employees || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="Konum Takibi"
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
      />
      {loading && !data ? (
        <View style={styles.centered}><LoadingSpinner size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await hapticFeedback.light();
                await load();
              }}
            />
          }
        >
          <Text style={styles.section}>Saha personeli ({employees.length})</Text>
          {employees.length === 0 ? <Text style={styles.muted}>Son 1 saatte konum paylaşan personel yok.</Text> : employees.map((emp) => (
            <TouchableOpacity
              key={emp.id}
              style={styles.card}
              disabled={!emp.coordinates}
              onPress={() => emp.coordinates && openMaps(emp.coordinates.lat, emp.coordinates.lng, emp.name)}
            >
              <View style={styles.row}>
                <Ionicons name={emp.coordinates ? 'navigate' : 'person'} size={20} color={COLORS.primary[600]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{emp.name}</Text>
                  <Text style={styles.sub}>{emp.position}{emp.last_update ? ` · ${emp.last_update}` : ''}</Text>
                  {emp.active_maintenance?.building_name ? (
                    <Text style={styles.sub}>İş: {emp.active_maintenance.building_name}</Text>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={styles.section}>Koordinatlı binalar ({buildings.length})</Text>
          {buildings.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.card}
              onPress={() => openMaps(b.coordinates.lat, b.coordinates.lng, b.name)}
            >
              <View style={styles.row}>
                <Ionicons name="business" size={20} color={COLORS.success[600]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{b.name}</Text>
                  <Text style={styles.sub}>{[b.district, b.city, b.address].filter(Boolean).join(' · ')}</Text>
                </View>
                <Ionicons name="open-outline" size={18} color={COLORS.gray[400]} />
              </View>
            </TouchableOpacity>
          ))}

          {missing.length > 0 && (
            <>
              <Text style={styles.section}>Koordinatsız binalar ({missing.length})</Text>
              {missing.map((b) => (
                <View key={b.id} style={styles.card}>
                  <Text style={styles.title}>{b.name}</Text>
                  <Text style={styles.sub}>Harita konumu tanımlı değil</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 40 },
  section: { marginTop: 16, marginBottom: 8, fontWeight: '700', color: COLORS.gray[800] },
  muted: { color: COLORS.gray[500], marginBottom: 8 },
  card: { backgroundColor: 'white', borderRadius: DIMENSIONS.BORDER_RADIUS, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.gray[200] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontWeight: '600', color: COLORS.gray[900] },
  sub: { color: COLORS.gray[500], fontSize: DIMENSIONS.FONT_SIZE.SM, marginTop: 2 },
});

export default LocationMapScreen;
