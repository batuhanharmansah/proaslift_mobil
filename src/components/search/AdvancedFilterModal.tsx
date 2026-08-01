// 🔧 ADVANCED FILTER MODAL COMPONENT
// Gelişmiş filtreleme seçenekleri - Tarih, durum, tip, öncelik vb.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DIMENSIONS } from '../../constants';
import { hapticFeedback } from '../../utils';
import DatePickerField from '../ui/DatePickerField';

export interface FilterOption {
  key: string;
  label: string;
  value: any;
}

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface AdvancedFilters {
  // Common filters
  search?: string;
  status?: string[];
  type?: string[];
  priority?: string[];
  dateRange?: DateRangeFilter;
  
  // Custom filters
  custom?: Record<string, any>;
}

interface AdvancedFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: AdvancedFilters) => void;
  onClear: () => void;
  currentFilters?: AdvancedFilters;
  
  // Filter options
  statusOptions?: FilterOption[];
  typeOptions?: FilterOption[];
  priorityOptions?: FilterOption[];
  allowDateRange?: boolean;
  allowCustomSearch?: boolean;
  
  // Custom filter sections
  customSections?: Array<{
    title: string;
    key: string;
    options: FilterOption[];
    multiple?: boolean;
  }>;
}

const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({
  visible,
  onClose,
  onApply,
  onClear,
  currentFilters = {},
  statusOptions = [],
  typeOptions = [],
  priorityOptions = [],
  allowDateRange = true,
  allowCustomSearch = true,
  customSections = [],
}) => {
  // ==================== STATE ====================
  const [filters, setFilters] = useState<AdvancedFilters>(currentFilters);
  const [selectedStatus, setSelectedStatus] = useState<string[]>(
    currentFilters.status || []
  );
  const [selectedType, setSelectedType] = useState<string[]>(
    currentFilters.type || []
  );
  const [selectedPriority, setSelectedPriority] = useState<string[]>(
    currentFilters.priority || []
  );
  const [dateRange, setDateRange] = useState<DateRangeFilter>(
    currentFilters.dateRange || {}
  );
  const [customSearch, setCustomSearch] = useState(
    currentFilters.search || ''
  );
  const [customFilters, setCustomFilters] = useState<Record<string, any>>(
    currentFilters.custom || {}
  );

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (visible) {
      // Reset to current filters when modal opens
      setSelectedStatus(currentFilters.status || []);
      setSelectedType(currentFilters.type || []);
      setSelectedPriority(currentFilters.priority || []);
      setDateRange(currentFilters.dateRange || {});
      setCustomSearch(currentFilters.search || '');
      setCustomFilters(currentFilters.custom || {});
    }
  }, [visible, currentFilters]);

  // ==================== HANDLERS ====================
  const handleStatusToggle = (status: string) => {
    hapticFeedback.light();
    setSelectedStatus(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleTypeToggle = (type: string) => {
    hapticFeedback.light();
    setSelectedType(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handlePriorityToggle = (priority: string) => {
    hapticFeedback.light();
    setSelectedPriority(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const handleCustomFilterToggle = (sectionKey: string, value: any, multiple: boolean = true) => {
    hapticFeedback.light();
    setCustomFilters(prev => {
      const current = prev[sectionKey] || [];
      if (multiple) {
        return {
          ...prev,
          [sectionKey]: current.includes(value)
            ? current.filter((v: any) => v !== value)
            : [...current, value],
        };
      } else {
        return {
          ...prev,
          [sectionKey]: current === value ? null : value,
        };
      }
    });
  };

  const handleApply = () => {
    hapticFeedback.success();
    
    const newFilters: AdvancedFilters = {};
    
    if (customSearch.trim()) {
      newFilters.search = customSearch.trim();
    }
    
    if (selectedStatus.length > 0) {
      newFilters.status = selectedStatus;
    }
    
    if (selectedType.length > 0) {
      newFilters.type = selectedType;
    }
    
    if (selectedPriority.length > 0) {
      newFilters.priority = selectedPriority;
    }
    
    if (dateRange.startDate || dateRange.endDate) {
      newFilters.dateRange = dateRange;
    }
    
    if (Object.keys(customFilters).length > 0) {
      newFilters.custom = customFilters;
    }
    
    onApply(newFilters);
    onClose();
  };

  const handleClear = () => {
    hapticFeedback.light();
    setSelectedStatus([]);
    setSelectedType([]);
    setSelectedPriority([]);
    setDateRange({});
    setCustomSearch('');
    setCustomFilters({});
    onClear();
  };

  // ==================== RENDER HELPERS ====================
  const renderFilterChips = (
    options: FilterOption[],
    selected: string[],
    onToggle: (value: string) => void
  ) => (
    <View style={styles.chipsContainer}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.chip,
              isSelected && styles.chipSelected,
            ]}
            onPress={() => onToggle(option.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                isSelected && styles.chipTextSelected,
              ]}
            >
              {option.label}
            </Text>
            {isSelected && (
              <Ionicons name="checkmark" size={16} color="white" style={styles.chipIcon} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderDateRangeInput = () => {
    if (!allowDateRange) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tarih Aralığı</Text>
        <View style={styles.dateInputContainer}>
          <View style={styles.dateInputFlex}>
            <DatePickerField
              label="Başlangıç"
              value={dateRange.startDate || ''}
              onChange={(v) => setDateRange(prev => ({ ...prev, startDate: v }))}
              placeholder="Başlangıç"
              style={{ marginBottom: 0 }}
            />
          </View>
          <Text style={styles.dateSeparator}>-</Text>
          <View style={styles.dateInputFlex}>
            <DatePickerField
              label="Bitiş"
              value={dateRange.endDate || ''}
              onChange={(v) => setDateRange(prev => ({ ...prev, endDate: v }))}
              placeholder="Bitiş"
              style={{ marginBottom: 0 }}
            />
          </View>
        </View>
      </View>
    );
  };

  // ==================== RENDER ====================
  const hasActiveFilters =
    selectedStatus.length > 0 ||
    selectedType.length > 0 ||
    selectedPriority.length > 0 ||
    dateRange.startDate ||
    dateRange.endDate ||
    customSearch.trim().length > 0 ||
    Object.keys(customFilters).length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Filtrele</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.gray[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Custom Search */}
            {allowCustomSearch && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Arama</Text>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search" size={20} color={COLORS.gray[400]} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Detaylı arama..."
                    placeholderTextColor={COLORS.gray[400]}
                    value={customSearch}
                    onChangeText={setCustomSearch}
                  />
                </View>
              </View>
            )}

            {/* Status Filter */}
            {statusOptions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Durum</Text>
                {renderFilterChips(statusOptions, selectedStatus, handleStatusToggle)}
              </View>
            )}

            {/* Type Filter */}
            {typeOptions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tip</Text>
                {renderFilterChips(typeOptions, selectedType, handleTypeToggle)}
              </View>
            )}

            {/* Priority Filter */}
            {priorityOptions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Öncelik</Text>
                {renderFilterChips(priorityOptions, selectedPriority, handlePriorityToggle)}
              </View>
            )}

            {/* Date Range */}
            {renderDateRangeInput()}

            {/* Custom Sections */}
            {customSections.map((section) => (
              <View key={section.key} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {renderFilterChips(
                  section.options,
                  customFilters[section.key] || [],
                  (value) => handleCustomFilterToggle(section.key, value, section.multiple)
                )}
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={handleClear}
              disabled={!hasActiveFilters}
            >
              <Text
                style={[
                  styles.buttonText,
                  !hasActiveFilters && styles.buttonTextDisabled,
                ]}
              >
                Temizle
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.applyButton]}
              onPress={handleApply}
            >
              <Text style={[styles.buttonText, styles.applyButtonText]}>Uygula</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[900],
    marginLeft: 8,
    paddingVertical: 0,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  chipSelected: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[600],
  },
  chipText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '500',
    color: COLORS.gray[700],
  },
  chipTextSelected: {
    color: 'white',
  },
  chipIcon: {
    marginLeft: 6,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dateInputFlex: {
    flex: 1,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  dateInputText: {
    flex: 1,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[900],
  },
  dateSeparator: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    color: COLORS.gray[500],
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: COLORS.gray[100],
  },
  applyButton: {
    backgroundColor: COLORS.primary[600],
  },
  buttonText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  buttonTextDisabled: {
    color: COLORS.gray[400],
  },
  applyButtonText: {
    color: 'white',
  },
});

export default AdvancedFilterModal;
