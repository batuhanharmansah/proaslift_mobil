// 👤 PROFILE SCREEN
// Kullanıcı profil ekranı - Bilgiler, şifre değiştirme, çıkış

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

import { useAuth } from '../../store/authStore';
import { AuthService } from '../../services/auth/AuthService';
import { COLORS, DIMENSIONS, PASSWORD_MIN_LENGTH } from '../../constants';
import { hapticFeedback } from '../../utils';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';
import { formatDate } from '../../utils/dateUtils';
import LocationStatusIndicator from '../../components/location/LocationStatusIndicator';
import KeyboardAwareScrollView from '../../components/ui/KeyboardAwareScrollView';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen: React.FC = () => {
  // ==================== HOOKS ====================
  const navigation = useNavigation<NavigationProp>();
  const { user, logout, updateUser, refreshUser, isLoading: authLoading, isEmployee } = useAuth();

  // ==================== STATE ====================
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    // Screen'e odaklandığında kullanıcı bilgilerini yenile
    const unsubscribe = navigation.addListener('focus', () => {
      refreshUser();
    });
    
    return unsubscribe;
  }, [navigation, refreshUser]);

  // ==================== HANDLERS ====================
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    
    try {
      await refreshUser();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser]);

  const handleStartEdit = useCallback(() => {
    hapticFeedback.light();
    setIsEditing(true);
    setName(user?.name || '');
    setEmail(user?.email || '');
  }, [user]);

  const handleCancelEdit = useCallback(() => {
    hapticFeedback.light();
    setIsEditing(false);
    setName(user?.name || '');
    setEmail(user?.email || '');
  }, [user]);

  const handleSaveProfile = useCallback(async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Geçersiz E-posta', 'Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    try {
      setLoading(true);
      await hapticFeedback.medium();

      await updateUser({
        name: name.trim(),
        email: email.trim(),
      });

      setIsEditing(false);
      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.');
    } catch (error: any) {
      console.error('Update profile error:', error);
      Alert.alert('Hata', error.message || 'Profil güncellenemedi.');
    } finally {
      setLoading(false);
    }
  }, [name, email, updateUser]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm şifre alanlarını doldurun.');
      return;
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      Alert.alert('Geçersiz Şifre', `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalıdır.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Şifre Uyuşmuyor', 'Yeni şifre ve şifre tekrarı eşleşmiyor.');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Aynı Şifre', 'Yeni şifre mevcut şifre ile aynı olamaz.');
      return;
    }

    try {
      setLoading(true);
      await hapticFeedback.medium();

      await AuthService.changePassword(currentPassword, newPassword);

      // Şifre değiştirildiğinde tüm token'lar iptal edilir, logout yapılır
      Alert.alert(
        'Başarılı',
        'Şifreniz başarıyla değiştirildi. Güvenlik nedeniyle tekrar giriş yapmanız gerekiyor.',
        [
          {
            text: 'Tamam',
            onPress: async () => {
              await logout();
            },
          },
        ]
      );

      // Form'u temizle
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Change password error:', error);
      Alert.alert('Hata', error.message || 'Şifre değiştirilemedi.');
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, logout]);

  const handleLogout = useCallback(() => {
    hapticFeedback.light();
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkmak istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            await hapticFeedback.medium();
            await logout();
          },
        },
      ]
    );
  }, [logout]);

  // ==================== RENDER ====================
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="Profil"
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
      />

      <KeyboardAwareScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary[500]]}
            tintColor={COLORS.primary[500]}
          />
        }
      >
        {/* User Info Card */}
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color={COLORS.primary[600]} />
            </View>
            {!isEditing && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleStartEdit}
                disabled={loading}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.primary[600]} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.userInfo}>
            {isEditing ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Ad Soyad *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ad Soyad"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>E-posta *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="E-posta"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>

                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={handleCancelEdit}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={handleSaveProfile}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.saveButtonText}>Kaydet</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                {user.company_id && (
                  <View style={styles.infoRow}>
                    <Ionicons name="business-outline" size={16} color={COLORS.gray[600]} />
                    <Text style={styles.infoText}>Şirket ID: {user.company_id}</Text>
                  </View>
                )}
                {user.employee && (
                  <View style={styles.employeeInfo}>
                    <Ionicons name="briefcase-outline" size={16} color={COLORS.gray[600]} />
                    <Text style={styles.employeePosition}>
                      {user.employee.position_label || 'Çalışan'}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.gray[600]} />
                  <Text style={styles.infoText}>
                    Üyelik: {formatDate(user.created_at, 'short')}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Konum (sadece çalışan için) */}
        {isEmployee && (
          <View style={styles.card}>
            <LocationStatusIndicator showDetails={true} />
          </View>
        )}

        {/* Password Change Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Şifre Değiştir</Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => {
                hapticFeedback.light();
                setShowPasswordForm(!showPasswordForm);
                if (showPasswordForm) {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }
              }}
            >
              <Ionicons
                name={showPasswordForm ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.gray[600]}
              />
            </TouchableOpacity>
          </View>

          {showPasswordForm && (
            <View style={styles.passwordForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mevcut Şifre *</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Mevcut şifrenizi girin"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <Ionicons
                      name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={COLORS.gray[600]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Yeni Şifre * (En az {PASSWORD_MIN_LENGTH} karakter)</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Yeni şifrenizi girin"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={COLORS.gray[600]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Yeni Şifre Tekrar *</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Yeni şifrenizi tekrar girin"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={COLORS.gray[600]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, styles.changePasswordButton]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="lock-closed-outline" size={20} color="white" />
                    <Text style={styles.changePasswordButtonText}>Şifreyi Değiştir</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loading || authLoading}
        >
          <Ionicons name="log-out-outline" size={24} color={COLORS.error[500]} />
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.primary[200],
  },
  editButton: {
    position: 'absolute',
    top: 0,
    right: '35%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    textAlign: 'center',
  },
  userEmail: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  companyName: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  employeePosition: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  infoText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[600],
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
    backgroundColor: 'white',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    backgroundColor: 'white',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[900],
  },
  eyeButton: {
    padding: 12,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.gray[100],
  },
  cancelButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  saveButton: {
    backgroundColor: COLORS.primary[600],
  },
  saveButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: 'white',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: COLORS.gray[900],
  },
  toggleButton: {
    padding: 8,
  },
  passwordForm: {
    marginTop: 8,
  },
  changePasswordButton: {
    backgroundColor: COLORS.primary[600],
    marginTop: 8,
  },
  changePasswordButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.error[200],
    gap: 12,
    marginBottom: 16,
  },
  logoutButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.error[500],
  },
});

export default ProfileScreen;
