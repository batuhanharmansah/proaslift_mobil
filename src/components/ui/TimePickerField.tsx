// ⏰ TIME PICKER FIELD
// Ortak saat seçici bileşeni - tr-TR locale ile

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DIMENSIONS } from '../../constants';
import { formatTime } from '../../utils/dateUtils';

export interface TimePickerFieldProps {
  value: string; // HH:mm veya HH:MM
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  editable?: boolean;
  style?: object;
}

const parseTime = (s: string): Date => {
  const today = new Date();
  if (!s || !/^\d{1,2}:\d{2}$/.test(s)) {
    return today;
  }
  const [h, m] = s.split(':').map(Number);
  today.setHours(isNaN(h) ? 9 : h % 24, isNaN(m) ? 0 : m % 60, 0, 0);
  return today;
};

const toTimeString = (d: Date): string => {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const TimePickerField: React.FC<TimePickerFieldProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Saat seçin',
  editable = true,
  style,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const displayValue = value ? formatTime(parseTime(value)) : '';
  const dateValue = parseTime(value);

  const handleChange = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) {
      onChange(toTimeString(date));
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
          <Ionicons name="time-outline" size={20} color={COLORS.gray[500]} />
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
        <Ionicons name="time-outline" size={20} color={COLORS.gray[500]} />
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
              mode="time"
              is24Hour
              display="default"
              onChange={handleChange}
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
                    mode="time"
                    is24Hour
                    display="spinner"
                    onChange={handleChange}
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

export default TimePickerField;
