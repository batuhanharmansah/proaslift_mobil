// 🔔 NOTIFICATION BELL BUTTON
// Header/navbar için kompakt bildirim ikonu - Badge ile okunmamış sayısı

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { COLORS, API_ENDPOINTS } from '../../constants';
import { apiClient } from '../../services/api/client';
import { hapticFeedback } from '../../utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface NotificationBellButtonProps {
  /** İkon rengi (header arka planına göre) */
  iconColor?: string;
}

const NotificationBellButton: React.FC<NotificationBellButtonProps> = ({
  iconColor = 'white',
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const navigation = useNavigation<NavigationProp>();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT) as any;
      const count = response?.data?.total_unread ?? response?.total_unread ?? 0;
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  const handlePress = useCallback(() => {
    hapticFeedback.light();
    navigation.navigate('Notifications');
  }, [navigation]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel="Bildirimler"
      accessibilityRole="button"
    >
      <Ionicons name="notifications-outline" size={26} color={iconColor} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error[500],
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default NotificationBellButton;
