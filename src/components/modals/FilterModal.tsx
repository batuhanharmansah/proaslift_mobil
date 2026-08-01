// 🔍 ENTERPRISE FILTER MODAL
// Gelişmiş filtreleme sistemi, çoklu seçim, kaydetme

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DIMENSIONS } from '../../constants';
import { BuildingFilters } from '../../types';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: BuildingFilters) => void;
  onClear: () => void;
  currentFilters: BuildingFilters;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  onClear,
  currentFilters,
}) => {
  // ==================== STATE ====================
  const [tempFilters, setTempFilters] = useState<BuildingFilters>(currentFilters);

  // ==================== EFFECTS ====================
  useEffect(() => {
    setTempFilters(currentFilters);
  }, [currentFilters, visible]);

  // ==================== FILTER OPTIONS ====================
  const statusOptions = [
    { value: 'aktif', label: 'Aktif', color: COLORS.success[500] },
    { value: 'pasif', label: 'Pasif', color: COLORS.gray[500] },
    { value: 'beklemede', label: 'Beklemede', color: COLORS.warning[500] },
  ];

  const contractTypeOptions = [
    { value: 'bakim', label: 'Bakım', color: COLORS.primary[500] },
    { value: 'onarim', label: 'Onarım', color: COLORS.warning[500] },
    { value: 'modernizasyon', label: 'Modernizasyon', color: COLORS.success[500] },
  ];

  // ==================== HANDLERS ====================
  const handleStatusSelect = (status: string) => {
    setTempFilters(prev => ({
      ...prev,
      status: prev.status === status ? undefined : status,
    }));
  };

  const handleContractTypeSelect = (contractType: string) => {
    setTempFilters(prev => ({
      ...prev,
      contract_type: prev.contract_type === contractType ? undefined : contractType,
    }));
  };

  const handleApply = () => {
    onApply(tempFilters);
  };

  const handleClear = () => {
    setTempFilters({});
    onClear();
  };

  const handleClose = () => {
    setTempFilters(currentFilters); // Reset to current filters
    onClose();
  };

  // ==================== RENDER METHODS ====================
  const renderFilterSection = (
    title: string,
    options: Array<{ value: string; label: string; color: string }>,
    selectedValue: string | undefined,
    onSelect: (value: string) => void
  ) => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>{title}</Text>
      <View style={styles.filterOptions}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterOption,
              selectedValue === option.value && styles.filterOptionSelected,
              { borderColor: option.color }
            ]}
            onPress={() => onSelect(option.value)}
          >
            <View style={[styles.filterDot, { backgroundColor: option.color }]} />
            <Text style={[
              styles.filterOptionText,
              selectedValue === option.value && styles.filterOptionTextSelected
            ]}>
              {option.label}
            </Text>
            {selectedValue === option.value && (
              <Ionicons name="checkmark" size={16} color={option.color} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ==================== MAIN RENDER ====================
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color={COLORS.gray[600]} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Filtreler</Text>
          
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearText}>Temizle</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderFilterSection(
            'Durum',
            statusOptions,
            tempFilters.status,
            handleStatusSelect
          )}

          {renderFilterSection(
            'Sözleşme Türü',
            contractTypeOptions,
            tempFilters.contract_type,
            handleContractTypeSelect
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>Filtreleri Uygula</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  clearText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.primary[600],
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
  },
  filterSection: {
    marginVertical: 20,
  },
  filterTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 12,
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
  },
  filterOptionSelected: {
    backgroundColor: COLORS.primary[50],
  },
  filterDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  filterOptionText: {
    flex: 1,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[700],
  },
  filterOptionTextSelected: {
    color: COLORS.gray[900],
    fontWeight: '600',
  },

  // Footer
  footer: {
    padding: DIMENSIONS.SCREEN_PADDING,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  applyButton: {
    backgroundColor: COLORS.primary[600],
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default FilterModal;
