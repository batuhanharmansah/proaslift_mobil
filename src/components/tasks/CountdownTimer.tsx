// ⏰ COUNTDOWN TIMER COMPONENT
// Yaklaşan işler için geri sayım timer'ı

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DIMENSIONS } from '../../constants';

interface CountdownTimerProps {
  targetDate: Date | string;
  targetTime?: string; // HH:mm format
  onExpired?: () => void;
  showIcon?: boolean;
  compact?: boolean;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  targetDate,
  targetTime,
  onExpired,
  showIcon = true,
  compact = false,
}) => {
  // ==================== STATE ====================
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  } | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // ==================== EFFECTS ====================
  useEffect(() => {
    const updateTimer = () => {
      try {
        const target = new Date(targetDate);
        
        // Eğer targetTime varsa, tarih ile birleştir
        if (targetTime) {
          const [hours, minutes] = targetTime.split(':').map(Number);
          target.setHours(hours || 0, minutes || 0, 0, 0);
        }

        const now = new Date();
        const diff = target.getTime() - now.getTime();

        if (diff <= 0) {
          setIsExpired(true);
          setTimeRemaining(null);
          if (onExpired) {
            onExpired();
          }
          return;
        }

        setIsExpired(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeRemaining({
          hours,
          minutes,
          seconds,
          total: diff,
        });
      } catch (error) {
        console.error('❌ Countdown timer error:', error);
        setIsExpired(true);
        setTimeRemaining(null);
      }
    };

    // İlk hesaplama
    updateTimer();

    // Her saniye güncelle
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate, targetTime, onExpired]);

  // ==================== RENDER HELPERS ====================
  const getStatus = (): 'urgent' | 'warning' | 'normal' => {
    if (!timeRemaining || isExpired) return 'urgent';
    
    const hours = timeRemaining.hours;
    
    if (hours < 1) return 'urgent'; // 1 saatten az
    if (hours < 3) return 'warning'; // 3 saatten az
    return 'normal';
  };

  const getStatusColor = (): string => {
    const status = getStatus();
    switch (status) {
      case 'urgent': return COLORS.error[500];
      case 'warning': return COLORS.warning[500];
      default: return COLORS.success[500];
    }
  };

  const getStatusText = (): string => {
    if (isExpired || !timeRemaining) {
      return 'Süre Doldu';
    }

    const { hours, minutes } = timeRemaining;
    
    if (hours === 0 && minutes === 0) {
      return 'Şimdi';
    } else if (hours === 0) {
      return `${minutes} dk`;
    } else if (hours < 24) {
      return `${hours}s ${minutes}d`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}g ${remainingHours}s`;
    }
  };

  // ==================== RENDER ====================
  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: `${getStatusColor()}20` }]}>
        {showIcon && (
          <Ionicons 
            name="time" 
            size={14} 
            color={getStatusColor()} 
            style={styles.compactIcon} 
          />
        )}
        <Text style={[styles.compactText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>
    );
  }

  if (!timeRemaining && !isExpired) {
    return null;
  }

  const statusColor = getStatusColor();

  return (
    <View style={[styles.container, { borderColor: statusColor }]}>
      {showIcon && (
        <Ionicons name="time-outline" size={16} color={statusColor} style={styles.icon} />
      )}
      
      <View style={styles.timerContent}>
        {isExpired ? (
          <Text style={[styles.timerText, { color: statusColor }]}>
            Süre Doldu
          </Text>
        ) : timeRemaining ? (
          <>
            {timeRemaining.hours > 0 && (
              <View style={styles.timeBlock}>
                <Text style={[styles.timeValue, { color: statusColor }]}>
                  {timeRemaining.hours.toString().padStart(2, '0')}
                </Text>
                <Text style={styles.timeLabel}>saat</Text>
              </View>
            )}
            <View style={styles.timeBlock}>
              <Text style={[styles.timeValue, { color: statusColor }]}>
                {timeRemaining.minutes.toString().padStart(2, '0')}
              </Text>
              <Text style={styles.timeLabel}>dakika</Text>
            </View>
            {timeRemaining.hours === 0 && (
              <View style={styles.timeBlock}>
                <Text style={[styles.timeValue, { color: statusColor }]}>
                  {timeRemaining.seconds.toString().padStart(2, '0')}
                </Text>
                <Text style={styles.timeLabel}>saniye</Text>
              </View>
            )}
          </>
        ) : null}
      </View>
    </View>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'white',
  },
  icon: {
    marginRight: 6,
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeBlock: {
    alignItems: 'center',
    minWidth: 32,
  },
  timeValue: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: 'bold',
  },
  timeLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  compactIcon: {
    marginRight: 2,
  },
  compactText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
  },
});

export default CountdownTimer;
