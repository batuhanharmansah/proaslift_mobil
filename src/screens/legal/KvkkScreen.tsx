import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DIMENSIONS } from '../../constants';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const KvkkScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KVKK & Gizlilik</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>KVKK Aydınlatma Metni{'\n'}& Gizlilik Politikası</Text>
        <Text style={styles.updateDate}>Son güncelleme: Mart 2026 · Harmanşah Yazılım</Text>

        {/* 1 */}
        <Section title="1. Veri Sorumlusu">
          <Text style={styles.body}>
            6698 sayılı KVKK kapsamında veri sorumlusu sıfatıyla kişisel verileriniz
            <Text style={styles.bold}> Harmanşah Yazılım</Text> tarafından işlenmektedir.
          </Text>
          <Text style={styles.body}>İletişim: info@proaslift.com</Text>
        </Section>

        {/* 2 */}
        <Section title="2. İşlenen Veriler ve Amaçları">
          {[
            ['Kimlik / İletişim', 'Ad, soyad, e-posta, telefon — hesap ve personel yönetimi'],
            ['Konum Verisi', 'Enlem/boylam — yalnızca aktif bakım görevi sırasında'],
            ['Güvenlik / Log', 'Token, IP, user-agent — oturum güvenliği ve denetim'],
            ['İş Kayıtları', 'Bakım raporu, malzeme, maliyet — hizmet sunumu'],
            ['Finansal', 'Gelir/gider, alacak/borç — muhasebe yükümlülüğü'],
          ].map(([cat, desc]) => (
            <View key={cat} style={styles.tableRow}>
              <Text style={styles.tableKey}>{cat}</Text>
              <Text style={styles.tableVal}>{desc}</Text>
            </View>
          ))}
        </Section>

        {/* 3 */}
        <Section title="3. Konum Verisi — Özel Bildirim">
          <View style={styles.highlightBox}>
            <Ionicons name="location-outline" size={18} color={COLORS.primary[600]} style={{ marginBottom: 6 }} />
            <Text style={styles.highlightText}>
              Konum verisi <Text style={styles.bold}>yalnızca aktif bakım görevi ekranında</Text> ve{' '}
              <Text style={styles.bold}>yalnızca ön planda (foreground)</Text> toplanır.
            </Text>
            <Text style={styles.highlightText}>
              Görev tamamlandığında veya ekrandan çıkıldığında <Text style={styles.bold}>otomatik olarak durur</Text>.
            </Text>
            <Text style={styles.highlightText}>
              Cihaz ayarlarından konum iznini istediğiniz zaman iptal edebilirsiniz.
            </Text>
          </View>
        </Section>

        {/* 4 */}
        <Section title="4. Veri Saklama Süreleri">
          {[
            ['Konum geçmişi', '1 yıl'],
            ['Personel bilgileri', 'Hesap silinene kadar + 10 yıl (TTK)'],
            ['Erişim logları', '2 yıl'],
            ['Finansal kayıtlar', '10 yıl (VUK)'],
            ['Bakım raporları', '5 yıl'],
          ].map(([type, period]) => (
            <View key={type} style={styles.tableRow}>
              <Text style={styles.tableKey}>{type}</Text>
              <Text style={[styles.tableVal, styles.bold]}>{period}</Text>
            </View>
          ))}
        </Section>

        {/* 5 */}
        <Section title="5. Haklarınız (KVKK md. 11)">
          {[
            'Kişisel verilerinizin işlenip işlenmediğini öğrenme',
            'Yanlış veya eksik verilerin düzeltilmesini isteme',
            'Verilerin silinmesini / yok edilmesini talep etme',
            'İşlenmesini kısıtlamasını talep etme',
            'Verilerin aktarıldığı üçüncü kişileri öğrenme',
            'Otomatik işlemeye itiraz etme',
          ].map((right) => (
            <View key={right} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{right}</Text>
            </View>
          ))}
          <Text style={[styles.body, { marginTop: 10 }]}>
            Haklarınızı kullanmak için{' '}
            <Text style={styles.link}>info@proaslift.com</Text> adresine başvurabilirsiniz. Talepler 30 gün içinde yanıtlanır.
          </Text>
        </Section>

        {/* 6 */}
        <Section title="6. Güvenlik Önlemleri">
          {[
            'Tüm veri aktarımı HTTPS (TLS 1.2+) ile şifrelenir',
            'Şifreler bcrypt hash ile saklanır, düz metin tutulmaz',
            'Mobil token\'lar Keychain / KeyStore ile şifreli saklanır',
            'API erişimi rate limiting ile korunmaktadır',
          ].map((item) => (
            <View key={item} style={styles.bulletRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.primary[500]} style={{ marginTop: 2 }} />
              <Text style={[styles.bulletText, { marginLeft: 8 }]}>{item}</Text>
            </View>
          ))}
        </Section>

        <Text style={styles.footer}>
          © 2026 Harmanşah Yazılım — Bu metin 6698 sayılı KVKK kapsamında hazırlanmıştır.
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
  header: {
    backgroundColor: COLORS.primary[600],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 28,
  },
  updateDate: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary[700],
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary[500],
    paddingLeft: 10,
    marginBottom: 12,
  },
  body: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 6,
  },
  bold: {
    fontWeight: '700',
    color: '#334155',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableKey: {
    width: '42%',
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  tableVal: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
  },
  highlightBox: {
    backgroundColor: COLORS.primary[50],
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.primary[200],
  },
  highlightText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 7,
  },
  bullet: {
    fontSize: 13,
    color: COLORS.primary[500],
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  link: {
    color: COLORS.primary[600],
    fontWeight: '600',
  },
  footer: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 17,
  },
});

export default KvkkScreen;
