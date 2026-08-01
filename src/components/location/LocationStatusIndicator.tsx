// 📍 LOCATION STATUS INDICATOR
// Konum takibi durumu göstergesi - Aktif/pasif, son güncelleme, izin durumu

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { locationService } from '../../services/location/LocationService';
import { COLORS, DIMENSIONS } from '../../constants';
import { formatTime } from '../../utils';

interface LocationStatusIndicatorProps {
  compact?: boolean;
  showDetails?: boolean;
}

const LocationStatusIndicator: React.FC<LocationStatusIndicatorProps> = ({
  compact = false,
  showDetails = true,
}) => {
  // ==================== STATE ====================
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<{
    foreground: string;
    background: string | null;
    isGranted: boolean;
  } | null>(null);

  // ==================== EFFECTS ====================
  useEffect(() => {
    // İlk yükleme
    updateStatus();

    // Her 5 saniyede bir durumu güncelle
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  // ==================== HANDLERS ====================
  const updateStatus = async () => {
    try {
      // Tracking durumu
      const tracking = locationService.isTrackingEnabled();
      setIsTracking(tracking);

      // Son güncelleme zamanı
      const lastUpdate = locationService.getLastUpdateTime();
      setLastUpdateTime(lastUpdate);

      // İzin durumu
      const permission = await locationService.getPermissionStatus();
      setPermissionStatus(permission);
    } catch (error) {
      console.error('❌ Update location status error:', error);
    }
  };

  const handlePress = () => {
    if (!permissionStatus?.isGranted) {
      Alert.alert(
        'Konum İzni Gerekli',
        'Konum takibini kullanmak için konum izni vermeniz gerekmektedir. Ayarlara gitmek ister misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Ayarlara Git',
            onPress: async () => {
              await locationService.requestPermissions();
              updateStatus();
            },
          },
        ]
      );
    } else if (showDetails) {
      // Detayları göster
      const statusText = isTracking ? 'Aktif' : 'Pasif';
      const lastUpdateText = lastUpdateTime
        ? formatTime(lastUpdateTime.toISOString())
        : 'Henüz güncellenmedi';
      
      Alert.alert(
        'Konum Durumu',
        `Durum: ${statusText}\nSon Güncelleme: ${lastUpdateText}\nİzin Durumu: ${permissionStatus?.foreground === 'granted' ? 'Verildi' : 'Verilmedi'}`,
        [{ text: 'Tamam' }]
      );
    }
  };

  // ==================== RENDER HELPERS ====================
  const getStatusColor = (): string => {
    if (!permissionStatus?.isGranted) {
      return COLORS.error[500];
    }
    return isTracking ? COLORS.success[500] : COLORS.warning[500];
  };

  const getStatusIcon = (): string => {
    if (!permissionStatus?.isGranted) {
      return 'location-outline';
    }
    return isTracking ? 'location' : 'location-outline';
  };

  const getStatusText = (): string => {
    if (!permissionStatus?.isGranted) {
      return 'İzin Gerekli';
    }
    return isTracking ? 'Aktif' : 'Pasif';
  };

  const getTimeAgo = (): string => {
    if (!lastUpdateTime) {
      return 'Henüz güncellenmedi';
    }

    const now = new Date();
    const diffMs = now.getTime() - lastUpdateTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 30) {
      return 'Az önce';
    } else if (diffSeconds < 60) {
      return `${diffSeconds} sn önce`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes} dk önce`;
    } else {
      return formatTime(lastUpdateTime.toISOString());
    }
  };

  // ==================== RENDER ====================
  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { borderColor: getStatusColor() }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Ionicons name={getStatusIcon()} size={16} color={getStatusColor()} />
        <Text style={[styles.compactText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { borderColor: getStatusColor() }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name={getStatusIcon()} size={24} color={getStatusColor()} />
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title}>Konum Takibi</Text>
          <Text style={[styles.status, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      {showDetails && (
        <View style={styles.details}>
          {lastUpdateTime && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color={COLORS.gray[600]} />
              <Text style={styles.detailText}>Son güncelleme: {getTimeAgo()}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Ionicons 
              name={permissionStatus?.isGranted ? 'checkmark-circle' : 'close-circle'} 
              size={14} 
              color={permissionStatus?.isGranted ? COLORS.success[500] : COLORS.error[500]} 
            />
            <Text style={styles.detailText}>
              İzin: {permissionStatus?.isGranted ? 'Verildi' : 'Verilmedi'}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  statusDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  status: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: 'bold',
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    paddingTop: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  compactText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
  },
});

export default LocationStatusIndicator;
