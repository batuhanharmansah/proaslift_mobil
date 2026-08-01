// 🏢 FİRMA PROFİLİ
// Firma bilgilerini görüntüleme ve düzenleme

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '../../services/api/client';
import { API_ENDPOINTS } from '../../constants';
import { Company } from '../../types';
import { COLORS, DIMENSIONS } from '../../constants';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import { hapticFeedback } from '../../utils';

const CompanyProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxNumber, setTaxNumber] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.COMPANY_PROFILE) as { data?: Company };
      const c = (res as any)?.data ?? null;
      setCompany(c);
      if (c) {
        setName(c.name ?? '');
        setAddress(c.address ?? '');
        setPhone(c.phone ?? '');
        setEmail(c.email ?? '');
        setTaxNumber((c as any).tax_number ?? '');
      }
    } catch {
      setCompany(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await hapticFeedback.light();
      await apiClient.put(API_ENDPOINTS.COMPANY_PROFILE, {
        name: name.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        tax_number: taxNumber.trim() || undefined,
      });
      await hapticFeedback.success();
      setIsEditing(false);
      loadProfile();
      Alert.alert('Başarılı', 'Firma bilgileri güncellendi.');
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.message ?? 'Güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !company) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.title}>Firma Profili</Text>
        {company && (
          <TouchableOpacity
            onPress={() => (isEditing ? handleSave() : setIsEditing(true))}
            style={styles.saveBtn}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color={COLORS.primary[500]} /> : (
              <Text style={styles.saveBtnText}>{isEditing ? 'Kaydet' : 'Düzenle'}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {!company ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Firma bilgisi yüklenemedi.</Text>
          <TouchableOpacity onPress={loadProfile} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Tekrar dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary[500]]} />}
        >
          <Text style={styles.label}>Firma adı</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            editable={isEditing}
            style={[styles.input, !isEditing && styles.inputReadOnly]}
            placeholder="Firma adı"
            placeholderTextColor={COLORS.gray[400]}
          />

          <Text style={styles.label}>Adres</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            editable={isEditing}
            multiline
            style={[styles.input, styles.textArea, !isEditing && styles.inputReadOnly]}
            placeholder="Adres"
            placeholderTextColor={COLORS.gray[400]}
          />

          <Text style={styles.label}>Telefon</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            editable={isEditing}
            keyboardType="phone-pad"
            style={[styles.input, !isEditing && styles.inputReadOnly]}
            placeholder="Telefon"
            placeholderTextColor={COLORS.gray[400]}
          />

          <Text style={styles.label}>E-posta</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            editable={isEditing}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, !isEditing && styles.inputReadOnly]}
            placeholder="E-posta"
            placeholderTextColor={COLORS.gray[400]}
          />

          <Text style={styles.label}>Vergi numarası</Text>
          <TextInput
            value={taxNumber}
            onChangeText={setTaxNumber}
            editable={isEditing}
            keyboardType="number-pad"
            style={[styles.input, !isEditing && styles.inputReadOnly]}
            placeholder="Vergi no"
            placeholderTextColor={COLORS.gray[400]}
          />
        </ScrollView>
      )}

      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray[50] },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: DIMENSIONS.FONT_SIZE.MD, color: COLORS.gray[600], marginBottom: 16 },
  retryBtn: { padding: 12, backgroundColor: COLORS.primary[500], borderRadius: 8 },
  retryBtnText: { color: COLORS.white, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  menuBtn: { padding: 8 },
  title: { fontSize: DIMENSIONS.FONT_SIZE.XL, fontWeight: '700', color: COLORS.gray[900] },
  saveBtn: { minWidth: 70, alignItems: 'flex-end' },
  saveBtnText: { fontSize: DIMENSIONS.FONT_SIZE.MD, fontWeight: '600', color: COLORS.primary[600] },
  scroll: { flex: 1 },
  scrollContent: { padding: DIMENSIONS.SCREEN_PADDING, paddingBottom: 40 },
  label: { fontSize: DIMENSIONS.FONT_SIZE.SM, fontWeight: '600', color: COLORS.gray[700], marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    padding: 12,
    fontSize: DIMENSIONS.FONT_SIZE.MD,
    color: COLORS.gray[900],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  inputReadOnly: { backgroundColor: COLORS.gray[50], color: COLORS.gray[700] },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
});

export default CompanyProfileScreen;
