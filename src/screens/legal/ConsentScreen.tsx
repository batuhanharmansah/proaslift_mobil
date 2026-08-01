// 📋 CONSENT SCREEN
// İlk açılışta KVKK ve kullanım koşulları onayı
// Yalnızca bir kez gösterilir — onay AsyncStorage'a kaydedilir

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { APP_CONFIG, COLORS } from '../../constants';

export const CONSENT_STORAGE_KEY = '@consent_v1';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DATA_ITEMS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'person-outline', text: 'Ad, e-posta — hesap ve personel yönetimi için' },
  { icon: 'location-outline', text: 'Konum — yalnızca aktif bakım görevi sırasında, ön planda' },
  { icon: 'camera-outline', text: 'Kamera / Fotoğraf — bakım raporlarına görsel eklemek için' },
  { icon: 'notifications-outline', text: 'Bildirimler — atanan görevler ve sistem uyarıları için' },
  { icon: 'finger-print-outline', text: 'Biyometri (Face ID / Parmak izi) — hızlı ve güvenli giriş için' },
];

const ConsentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const canProceed = kvkkAccepted && termsAccepted;

  const handleAccept = async () => {
    if (!canProceed) return;
    try {
      setSaving(true);
      await AsyncStorage.setItem(CONSENT_STORAGE_KEY, 'true');
      navigation.replace('Login');
    } catch {
      Alert.alert('Hata', 'Onay kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Başlık */}
        <View style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <Ionicons name="shield-checkmark" size={44} color={COLORS.primary[600]} />
          </View>
          <Text style={styles.appName}>{APP_CONFIG.NAME}</Text>
          <Text style={styles.subtitle}>Gizlilik ve Kullanım Koşulları</Text>
        </View>

        {/* Giriş açıklaması */}
        <View style={styles.card}>
          <Text style={styles.introText}>
            Uygulamayı kullanmadan önce kişisel verilerinizin nasıl işlendiği hakkında sizi bilgilendirmek istiyoruz. Devam etmek için aşağıdaki koşulları okumanız ve onaylamanız gerekmektedir.
          </Text>
        </View>

        {/* Toplanan veri özeti */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hangi Veriler Toplanıyor?</Text>
          {DATA_ITEMS.map(({ icon, text }) => (
            <View key={icon} style={styles.dataRow}>
              <Ionicons name={icon} size={17} color={COLORS.primary[500]} style={styles.dataIcon} />
              <Text style={styles.dataText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Checkbox 1: KVKK */}
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setKvkkAccepted(!kvkkAccepted)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, kvkkAccepted && styles.checkboxChecked]}>
            {kvkkAccepted && <Ionicons name="checkmark" size={14} color="white" />}
          </View>
          <Text style={styles.checkLabel}>
            <Text
              style={styles.checkLink}
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate('Kvkk');
              }}
            >
              KVKK Aydınlatma Metni
            </Text>
            {"'ni okudum, kişisel verilerimin yukarıda belirtilen amaçlarla işlenmesini onaylıyorum."}
          </Text>
        </TouchableOpacity>

        {/* Checkbox 2: Kullanım Koşulları */}
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setTermsAccepted(!termsAccepted)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
            {termsAccepted && <Ionicons name="checkmark" size={14} color="white" />}
          </View>
          <Text style={styles.checkLabel}>
            Kullanım koşullarını okudum ve uygulamayı yalnızca yetkili iş amaçlarıyla kullanacağımı kabul ediyorum.
          </Text>
        </TouchableOpacity>

        {/* Kabul butonu */}
        <TouchableOpacity
          style={[styles.acceptBtn, !canProceed && styles.acceptBtnDisabled]}
          onPress={handleAccept}
          disabled={!canProceed || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.acceptBtnText}>Kabul Et ve Devam Et</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>
          Her iki onay kutucuğunu işaretlemeden uygulamayı kullanamazsınız.{'\n'}
          Harmanşah Yazılım · info@proaslift.com
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  logoArea: {
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 28,
  },
  logoIcon: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: COLORS.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  introText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dataIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  dataText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary[400],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[600],
  },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  checkLink: {
    color: COLORS.primary[600],
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary[600],
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  acceptBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  acceptBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  footer: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ConsentScreen;
