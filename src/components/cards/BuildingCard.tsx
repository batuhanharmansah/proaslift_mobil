// 🏢 ENTERPRISE BUILDING CARD COMPONENT
// Detaylı bina bilgileri, durum göstergeleri, asansör etiket sistemi

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Building } from '../../types';
import { formatCurrency, formatDate, getStatusColor, getElevatorLabelColor } from '../../utils';
import { COLORS, DIMENSIONS } from '../../constants';

interface BuildingCardProps {
  building: Building;
  onPress: () => void;
  showDetails?: boolean;
  isEmployee?: boolean;
}

const BuildingCard: React.FC<BuildingCardProps> = ({
  building,
  onPress,
  showDetails = true,
  isEmployee = false,
}) => {
  // ==================== COMPUTED VALUES ====================
  const statusColor = getStatusColor(building.status, 'building');
  const operationalStatusColor = getStatusColor(building.operational_status, 'building');
  const labelColor = building.activeLabel 
    ? getElevatorLabelColor(building.activeLabel.label_color)
    : COLORS.gray[400];

  const isContractExpiring = () => {
    const endDate = new Date(building.contract_end_date);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isContractExpired = () => {
    const endDate = new Date(building.contract_end_date);
    const now = new Date();
    return endDate < now;
  };

  // ==================== RENDER METHODS ====================
  const renderStatusBadge = (status: string, color: string, label: string) => (
    <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );

  const renderElevatorInfo = () => (
    <View style={styles.elevatorInfo}>
      <View style={styles.elevatorItem}>
        <Ionicons name="layers-outline" size={16} color={COLORS.gray[500]} />
        <Text style={styles.elevatorText}>
          {building.elevator_count} Asansör
        </Text>
      </View>
      
      <View style={styles.elevatorItem}>
        <Ionicons name="business-outline" size={16} color={COLORS.gray[500]} />
        <Text style={styles.elevatorText}>
          {building.floor_count} Kat
        </Text>
      </View>
      
      {building.elevator_type && (
        <View style={styles.elevatorItem}>
          <Ionicons name="arrow-up-outline" size={16} color={COLORS.gray[500]} />
          <Text style={styles.elevatorText}>
            {building.elevator_type === 'yolcu' ? 'Yolcu' :
             building.elevator_type === 'yuk' ? 'Yük' :
             building.elevator_type === 'hasta' ? 'Hasta' : 'Karma'}
          </Text>
        </View>
      )}
    </View>
  );

  const renderContractInfo = () => (
    <View style={styles.contractInfo}>
      <View style={styles.contractItem}>
        <Text style={styles.contractLabel}>Aylık Ücret</Text>
        <Text style={styles.contractValue}>
          {formatCurrency(building.monthly_fee)}
        </Text>
      </View>
      
      <View style={styles.contractItem}>
        <Text style={styles.contractLabel}>Sözleşme Bitimi</Text>
        <Text style={[
          styles.contractValue,
          isContractExpired() ? { color: COLORS.error[500] } :
          isContractExpiring() ? { color: COLORS.warning[500] } :
          { color: COLORS.success[500] }
        ]}>
          {formatDate(building.contract_end_date)}
        </Text>
      </View>
    </View>
  );

  const renderElevatorLabel = () => {
    if (!building.activeLabel) return null;

    return (
      <View style={styles.labelContainer}>
        <View style={[styles.labelIndicator, { backgroundColor: labelColor }]} />
        <Text style={styles.labelText}>
          {building.activeLabel.label_color_text} Etiket
        </Text>
        <Text style={styles.labelDate}>
          {formatDate(building.activeLabel.control_date)}
        </Text>
      </View>
    );
  };

  // ==================== MAIN RENDER ====================
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.buildingName} numberOfLines={1}>
            {building.name}
          </Text>
          <Text style={styles.buildingAddress} numberOfLines={1}>
            {building.district}, {building.city}
          </Text>
        </View>
        
        <View style={styles.statusContainer}>
          {renderStatusBadge(
            building.status,
            statusColor,
            building.status === 'aktif' ? 'Aktif' :
            building.status === 'pasif' ? 'Pasif' : 'Beklemede'
          )}
        </View>
      </View>

      {/* Elevator Info */}
      {renderElevatorInfo()}

      {/* Contract Info - Sadece admin için */}
      {showDetails && !isEmployee && renderContractInfo()}

      {/* Elevator Label */}
      {building.activeLabel && renderElevatorLabel()}

      {/* Warning Indicators - Sözleşme uyarılarını çalışan görmesin */}
      <View style={styles.indicators}>
        {!isEmployee && isContractExpired() && (
          <View style={[styles.indicator, { backgroundColor: COLORS.error[50] }]}>
            <Ionicons name="alert-circle" size={16} color={COLORS.error[500]} />
            <Text style={[styles.indicatorText, { color: COLORS.error[500] }]}>
              Sözleşme Süresi Dolmuş
            </Text>
          </View>
        )}
        
        {!isEmployee && isContractExpiring() && !isContractExpired() && (
          <View style={[styles.indicator, { backgroundColor: COLORS.warning[50] }]}>
            <Ionicons name="time" size={16} color={COLORS.warning[500]} />
            <Text style={[styles.indicatorText, { color: COLORS.warning[500] }]}>
              Sözleşme Yakında Bitiyor
            </Text>
          </View>
        )}
        
        {building.operational_status === 'arizali' && (
          <View style={[styles.indicator, { backgroundColor: COLORS.error[50] }]}>
            <Ionicons name="warning" size={16} color={COLORS.error[500]} />
            <Text style={[styles.indicatorText, { color: COLORS.error[500] }]}>
              Arızalı
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.gray[400]} />
          <Text style={styles.footerText}>
            {formatDate(building.created_at, 'relative')}
          </Text>
        </View>
        
        <Ionicons name="chevron-forward" size={16} color={COLORS.gray[400]} />
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  buildingName: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 2,
  },
  buildingAddress: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
  },

  // Elevator info
  elevatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  elevatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  elevatorText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
    marginLeft: 4,
  },

  // Contract info
  contractInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  contractItem: {
    flex: 1,
  },
  contractLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
    marginBottom: 2,
  },
  contractValue: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[900],
  },

  // Elevator label
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  labelIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  labelText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[700],
    flex: 1,
  },
  labelDate: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
  },

  // Indicators
  indicators: {
    marginBottom: 12,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  indicatorText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
    marginLeft: 4,
  },
});

export default BuildingCard;
