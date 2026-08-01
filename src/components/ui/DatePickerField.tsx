// 📅 DATE PICKER FIELD
// Ortak tarih seçici bileşeni - tr-TR locale ile Türkçe aylar

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DIMENSIONS } from '../../constants';
import { formatDate } from '../../utils/dateUtils';

export interface DatePickerFieldProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  editable?: boolean;
  style?: object;
}

const DatePickerField: React.FC<DatePickerFieldProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Tarih seçin',
  minimumDate,
  maximumDate,
  editable = true,
  style,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const displayValue = value ? formatDate(value, 'short') : '';
  const dateValue = value ? new Date(value + 'T12:00:00') : new Date();

  const handleChange = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) {
      const ymd = date.toISOString().split('T')[0];
      onChange(ymd);
    }
  };

  const handleClose = () => {
    setShowPicker(false);
  };

  if (!editable) {
    return (
      <View style={[styles.container, style]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={[styles.input, styles.inputDisabled]}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.gray[500]} />
          <Text style={[styles.inputText, !displayValue && styles.placeholder]}>
            {displayValue || placeholder}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={20} color={COLORS.gray[500]} />
        <Text style={[styles.inputText, !displayValue && styles.placeholder]}>
          {displayValue || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.gray[500]} />
      </TouchableOpacity>

      {showPicker && (
        <>
          {Platform.OS === 'android' ? (
            <DateTimePicker
              value={dateValue}
              mode="date"
              display="default"
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              locale="tr-TR"
            />
          ) : (
            <Modal transparent animationType="slide">
              <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={handleClose}
              >
                <View style={styles.modalContent}>
                  <DateTimePicker
                    value={dateValue}
                    mode="date"
                    display="spinner"
                    onChange={handleChange}
                    minimumDate={minimumDate}
                    maximumDate={maximumDate}
                    locale="tr-TR"
                    style={styles.picker}
                  />
                  <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
                    <Text style={styles.doneText}>Tamam</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    gap: 8,
  },
  inputDisabled: {
    backgroundColor: COLORS.gray[100],
  },
  inputText: {
    flex: 1,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[900],
  },
  placeholder: {
    color: COLORS.gray[400],
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  picker: {
    height: 200,
  },
  doneButton: {
    padding: 16,
    alignItems: 'center',
  },
  doneText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.primary[600],
  },
});

export default DatePickerField;
