// 📱 APP HEADER
// Tutarlı navbar - tüm ekranlarda: Geri + Başlık + Menü

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DIMENSIONS } from '../../constants';

export interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  onMenuPress: () => void;
  rightElement?: React.ReactNode;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = false,
  onBackPress,
  onMenuPress,
  rightElement,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        {/* Sol: Geri veya Menü */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={showBack ? onBackPress : onMenuPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showBack ? 'arrow-back' : 'menu'}
            size={26}
            color="white"
          />
        </TouchableOpacity>

        {/* Orta: Başlık */}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Sağ: Özel element + Menü (detay ekranlarında her zaman menü) */}
        <View style={[styles.rightContainer, rightElement ? styles.rightRow : undefined]}>
          {rightElement}
          {showBack && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onMenuPress}
              activeOpacity={0.7}
            >
              <Ionicons name="menu" size={26} color="white" />
            </TouchableOpacity>
          )}
          {!showBack && !rightElement && <View style={styles.iconButton} />}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary[600],
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 8,
    justifyContent: 'center',
  },
  title: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: 'white',
  },
  rightContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AppHeader;
