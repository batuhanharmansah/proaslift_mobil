// 🏢 Yeni Bina Ekleme - Telefondan bina oluşturma

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import KeyboardAwareScrollView from '../../components/ui/KeyboardAwareScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { COLORS, DIMENSIONS, API_ENDPOINTS } from '../../constants';
import { apiClient } from '../../services/api/client';
import { hapticFeedback } from '../../utils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ELEVATOR_TYPES: { value: 'yolcu' | 'yuk' | 'hasta' | 'karma'; label: string }[] = [
  { value: 'yolcu', label: 'Yolcu' },
  { value: 'yuk', label: 'Yük' },
  { value: 'hasta', label: 'Hasta' },
  { value: 'karma', label: 'Karma' },
];

const CONTRACT_TYPES: { value: 'bakim' | 'onarim' | 'modernizasyon'; label: string }[] = [
  { value: 'bakim', label: 'Bakım' },
  { value: 'onarim', label: 'Onarım' },
  { value: 'modernizasyon', label: 'Modernizasyon' },
];

const BuildingCreateScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [floorCount, setFloorCount] = useState('');
  const [elevatorCount, setElevatorCount] = useState('');
  const [elevatorType, setElevatorType] = useState<'yolcu' | 'yuk' | 'hasta' | 'karma'>('yolcu');
  const [contractType, setContractType] = useState<'bakim' | 'onarim' | 'modernizasyon'>('bakim');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [elevatorCode, setElevatorCode] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [responsiblePhone, setResponsiblePhone] = useState('');
  const [responsibleEmail, setResponsibleEmail] = useState('');

  const showElevatorTypePicker = useCallback(() => {
    hapticFeedback.light();
    Alert.alert(
      'Asansör tipi',
      '',
      ELEVATOR_TYPES.map(({ value, label }) => ({
        text: label,
        onPress: () => setElevatorType(value),
      }))
    );
  }, []);

  const showContractTypePicker = useCallback(() => {
    hapticFeedback.light();
    Alert.alert(
      'Sözleşme tipi',
      '',
      CONTRACT_TYPES.map(({ value, label }) => ({
        text: label,
        onPress: () => setContractType(value),
      }))
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    const floor = parseInt(floorCount, 10);
    const elevCount = parseInt(elevatorCount, 10);
    const fee = parseFloat(monthlyFee.replace(',', '.'));

    if (!name.trim()) {
      Alert.alert('Hata', 'Bina adı girin.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Hata', 'Adres girin.');
      return;
    }
    if (!district.trim()) {
      Alert.alert('Hata', 'İlçe girin.');
      return;
    }
    if (!city.trim()) {
      Alert.alert('Hata', 'Şehir girin.');
      return;
    }
    if (!Number.isInteger(floor) || floor < 1) {
      Alert.alert('Hata', 'Kat sayısı 1 veya daha fazla olmalı.');
      return;
    }
    if (!Number.isInteger(elevCount) || elevCount < 1) {
      Alert.alert('Hata', 'Asansör sayısı 1 veya daha fazla olmalı.');
      return;
    }
    if (Number.isNaN(fee) || fee < 0) {
      Alert.alert('Hata', 'Aylık ücret geçerli bir sayı olmalı.');
      return;
    }
    if (!contractStartDate.trim()) {
      Alert.alert('Hata', 'Sözleşme başlangıç tarihi girin (YYYY-MM-DD).');
      return;
    }
    if (!contractEndDate.trim()) {
      Alert.alert('Hata', 'Sözleşme bitiş tarihi girin (YYYY-MM-DD).');
      return;
    }

    await hapticFeedback.light();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        address: address.trim(),
        district: district.trim(),
        city: city.trim(),
        floor_count: floor,
        elevator_count: elevCount,
        elevator_type: elevatorType,
        contract_type: contractType,
        monthly_fee: fee,
        contract_start_date: contractStartDate.trim(),
        contract_end_date: contractEndDate.trim(),
      };
      if (elevatorCode.trim()) payload.elevator_code = elevatorCode.trim();
      if (responsiblePerson.trim()) payload.responsible_person = responsiblePerson.trim();
      if (responsiblePhone.trim()) payload.responsible_phone = responsiblePhone.trim();
      if (responsibleEmail.trim()) payload.responsible_email = responsibleEmail.trim();

      const response = await apiClient.post(API_ENDPOINTS.BUILDINGS, payload) as { success?: boolean; data?: { id: number }; message?: string };
      if (response?.success && response?.data?.id) {
        Alert.alert('Başarılı', 'Bina eklendi.', [
          { text: 'Tamam', onPress: () => navigation.navigate('Buildings') },
          { text: 'Detay', onPress: () => navigation.navigate('BuildingDetail', { buildingId: response.data?.id ?? 0 }) },
        ]);
      } else {
        Alert.alert('Hata', response?.message || 'Bina eklenirken bir hata oluştu.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Bina eklenemedi.';
      const errors = err?.response?.data?.errors;
      Alert.alert('Hata', errors ? Object.values(errors).flat().join('\n') : msg);
    } finally {
      setSaving(false);
    }
  }, [
    name, address, district, city, floorCount, elevatorCount, elevatorType, contractType,
    monthlyFee, contractStartDate, contractEndDate, elevatorCode,
    responsiblePerson, responsiblePhone, responsibleEmail, navigation,
  ]);

  const elevatorTypeLabel = ELEVATOR_TYPES.find(t => t.value === elevatorType)?.label ?? elevatorType;
  const contractTypeLabel = CONTRACT_TYPES.find(t => t.value === contractType)?.label ?? contractType;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>Temel bilgiler</Text>
          <TextInput
            style={styles.input}
            placeholder="Bina adı *"
            placeholderTextColor={COLORS.gray[400]}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Adres *"
            placeholderTextColor={COLORS.gray[400]}
            value={address}
            onChangeText={setAddress}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="İlçe *"
            placeholderTextColor={COLORS.gray[400]}
            value={district}
            onChangeText={setDistrict}
          />
          <TextInput
            style={styles.input}
            placeholder="Şehir *"
            placeholderTextColor={COLORS.gray[400]}
            value={city}
            onChangeText={setCity}
          />

          <Text style={styles.sectionTitle}>Asansör bilgileri</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.inputHalf]}
              placeholder="Kat sayısı *"
              placeholderTextColor={COLORS.gray[400]}
              value={floorCount}
              onChangeText={setFloorCount}
              keyboardType="number-pad"
            />
            <TextInput
              style={[styles.input, styles.inputHalf]}
              placeholder="Asansör sayısı *"
              placeholderTextColor={COLORS.gray[400]}
              value={elevatorCount}
              onChangeText={setElevatorCount}
              keyboardType="number-pad"
            />
          </View>
          <TouchableOpacity style={styles.pickerButton} onPress={showElevatorTypePicker}>
            <Text style={styles.pickerButtonText}>{elevatorTypeLabel}</Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.gray[600]} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Asansör kodu (isteğe bağlı)"
            placeholderTextColor={COLORS.gray[400]}
            value={elevatorCode}
            onChangeText={setElevatorCode}
          />

          <Text style={styles.sectionTitle}>Sözleşme</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={showContractTypePicker}>
            <Text style={styles.pickerButtonText}>{contractTypeLabel}</Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.gray[600]} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Aylık ücret (₺) *"
            placeholderTextColor={COLORS.gray[400]}
            value={monthlyFee}
            onChangeText={setMonthlyFee}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Sözleşme başlangıç (YYYY-MM-DD) *"
            placeholderTextColor={COLORS.gray[400]}
            value={contractStartDate}
            onChangeText={setContractStartDate}
          />
          <TextInput
            style={styles.input}
            placeholder="Sözleşme bitiş (YYYY-MM-DD) *"
            placeholderTextColor={COLORS.gray[400]}
            value={contractEndDate}
            onChangeText={setContractEndDate}
          />

          <Text style={styles.sectionTitle}>Yetkili (isteğe bağlı)</Text>
          <TextInput
            style={styles.input}
            placeholder="Yetkili adı"
            placeholderTextColor={COLORS.gray[400]}
            value={responsiblePerson}
            onChangeText={setResponsiblePerson}
          />
          <TextInput
            style={styles.input}
            placeholder="Yetkili telefon"
            placeholderTextColor={COLORS.gray[400]}
            value={responsiblePhone}
            onChangeText={setResponsiblePhone}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Yetkili e-posta"
            placeholderTextColor={COLORS.gray[400]}
            value={responsibleEmail}
            onChangeText={setResponsibleEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="white" />
                <Text style={styles.submitButtonText}>Bina Ekle</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={styles.bottomPadding} />
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: DIMENSIONS.SCREEN_PADDING,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[600],
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[900],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    marginBottom: 10,
  },
  inputMultiline: {
    minHeight: 64,
  },
  inputHalf: {
    flex: 1,
    marginHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    marginBottom: 10,
  },
  pickerButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[900],
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[600],
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    paddingVertical: 14,
    marginTop: 24,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: 'white',
  },
  bottomPadding: {
    height: 24,
  },
});

export default BuildingCreateScreen;
