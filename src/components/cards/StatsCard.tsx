// 📊 ENTERPRISE STATS CARD COMPONENT
// Yeniden kullanılabilir, animasyonlu, erişilebilir istatistik kartı

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback } from '../../utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  subtitle?: string;
  onPress?: () => void;
  loading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color,
  subtitle,
  onPress,
  loading = false,
  trend,
  trendValue,
}) => {
  const handlePress = async () => {
    if (onPress) {
      await hapticFeedback.light();
      onPress();
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return COLORS.success[500];
      case 'down':
        return COLORS.error[500];
      default:
        return COLORS.gray[400];
    }
  };

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent
      style={[styles.container, { borderLeftColor: color }]}
      onPress={onPress ? handlePress : undefined}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
          
          {trend && trendValue && (
            <View style={styles.trendContainer}>
              <Ionicons 
                name={getTrendIcon()} 
                size={16} 
                color={getTrendColor()} 
              />
              <Text style={[styles.trendText, { color: getTrendColor() }]}>
                {trendValue}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingBar} />
            </View>
          ) : (
            <Text style={[styles.value, { color }]}>{value}</Text>
          )}
          
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: '48%',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
    marginLeft: 2,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    marginBottom: 4,
  },
  value: {
    fontSize: DIMENSIONS.FONT_SIZE.XXL,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
  },
  loadingContainer: {
    height: 32,
    justifyContent: 'center',
  },
  loadingBar: {
    height: 8,
    backgroundColor: COLORS.gray[200],
    borderRadius: 4,
    width: '70%',
  },
});

export default StatsCard;
