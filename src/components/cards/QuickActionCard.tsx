// ⚡ ENTERPRISE QUICK ACTION CARD
// Hızlı işlemler için optimize edilmiş, erişilebilir kart bileşeni

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DIMENSIONS } from '../../constants';

interface QuickActionCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  badge?: number;
  subtitle?: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  icon,
  color,
  onPress,
  disabled = false,
  badge,
  subtitle,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        disabled && styles.disabled,
        { borderColor: `${color}30` }
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Icon Container */}
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons 
            name={icon} 
            size={28} 
            color={disabled ? COLORS.gray[400] : color} 
          />
          
          {/* Badge */}
          {badge && badge > 0 && (
            <View style={[styles.badge, { backgroundColor: COLORS.error[500] }]}>
              <Text style={styles.badgeText}>
                {badge > 99 ? '99+' : badge.toString()}
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={[
          styles.title,
          disabled && styles.titleDisabled
        ]}>
          {title}
        </Text>

        {/* Subtitle */}
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: '48%',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: 'bold',
    color: 'white',
  },
  title: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[900],
    textAlign: 'center',
    marginBottom: 4,
  },
  titleDisabled: {
    color: COLORS.gray[400],
  },
  subtitle: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
});

export default QuickActionCard;
