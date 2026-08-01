// 🔐 ENTERPRISE LOGIN SCREEN
// Modern, güvenli, kullanıcı dostu giriş ekranı

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import KeyboardAwareScrollView from '../../components/ui/KeyboardAwareScrollView';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// Hooks & Services
import { useAuth } from '../../store/authStore';
import { hapticFeedback, validateEmail } from '../../utils';
import { COLORS, DIMENSIONS, APP_CONFIG, VALIDATION } from '../../constants';
import { biometricService } from '../../services/auth/BiometricService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // ==================== STATE ====================
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isCheckingBiometric, setIsCheckingBiometric] = useState(false);
  const biometricTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== HOOKS ====================
  const { login, isLoading, error, clearError, user, isAuthenticated } = useAuth();

  // ==================== EFFECTS ====================
  useEffect(() => {
    // Eğer zaten authenticated ise, hiçbir şey yapma (dashboard'a yönlendirilecek)
    if (isAuthenticated) {
      // Timeout varsa temizle
      if (biometricTimeoutRef.current) {
        clearTimeout(biometricTimeoutRef.current);
        biometricTimeoutRef.current = null;
      }
      return;
    }
    
    // Component mount olduğunda hataları temizle
    clearError();
    
    // Eğer cached user varsa email'i otomatik doldur
    if (user?.email && !isAuthenticated) {
      setEmail(user.email);
    }
    
    // Biometric availability kontrolü
    checkBiometricAvailability();
    
    // Biometric enabled kontrolü (sadece authenticated değilse)
    if (!isAuthenticated) {
      checkBiometricEnabled();
    }
    
    // Cleanup: Component unmount olduğunda timeout'u temizle
    return () => {
      if (biometricTimeoutRef.current) {
        clearTimeout(biometricTimeoutRef.current);
        biometricTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sadece ilk mount'ta çalış - isAuthenticated değiştiğinde zaten unmount olacak

  // Biometric availability kontrolü
  const checkBiometricAvailability = async () => {
    try {
      const available = await biometricService.isAvailable();
      setBiometricAvailable(available);
    } catch (error) {
      console.error('❌ Biometric availability check error:', error);
      setBiometricAvailable(false);
    }
  };

  // Biometric enabled kontrolü
  const checkBiometricEnabled = async () => {
    // Eğer zaten authenticated ise, Face ID çalıştırma
    if (isAuthenticated) {
      return;
    }

    try {
      const enabled = await biometricService.isEnabled();
      setBiometricEnabled(enabled);
      
      // Eğer enabled ise, otomatik olarak hızlı giriş dene (sadece authenticated değilse)
      if (enabled && !isAuthenticated) {
        attemptBiometricLogin();
      }
    } catch (error) {
      console.error('❌ Biometric enabled check error:', error);
      setBiometricEnabled(false);
    }
  };

  // Biometric ile hızlı giriş denemesi
  const attemptBiometricLogin = async () => {
    // Eğer zaten authenticated ise, Face ID çalıştırma
    if (isAuthenticated) {
      return;
    }
    
    try {
      setIsCheckingBiometric(true);
      
      const credentials = await biometricService.quickLogin();
      if (credentials) {
        // Credentials bulundu, otomatik login yap
        setEmail(credentials.email);
        setPassword(credentials.password);
        
        // Kısa bir gecikme sonrası login yap (UX için)
        // Önceki timeout varsa temizle
        if (biometricTimeoutRef.current) {
          clearTimeout(biometricTimeoutRef.current);
        }
        
        biometricTimeoutRef.current = setTimeout(async () => {
          // Login başarılı olduğunda LoginScreen unmount olacak, bu yüzden kontrol gerekmez
          try {
            // Login yap - eğer başarılı olursa isAuthenticated otomatik true olacak
            await login(credentials);
            await hapticFeedback.success();
            // Login başarılı oldu, Face ID denemesini durdur
            setIsCheckingBiometric(false);
            biometricTimeoutRef.current = null;
          } catch (error: any) {
            // Biometric login başarısız, credentials'ı sil
            await biometricService.deleteCredentials();
            setBiometricEnabled(false);
            await hapticFeedback.error();
            setIsCheckingBiometric(false);
            biometricTimeoutRef.current = null;
          }
        }, 300);
      } else {
        setIsCheckingBiometric(false);
      }
    } catch (error) {
      console.error('❌ Biometric login attempt error:', error);
      setIsCheckingBiometric(false);
    }
  };

  useEffect(() => {
    // Email değiştiğinde email hatasını temizle
    if (emailError && email) {
      setEmailError('');
    }
  }, [email]);

  useEffect(() => {
    // Password değiştiğinde password hatasını temizle
    if (passwordError && password) {
      setPasswordError('');
    }
  }, [password]);

  // ==================== VALIDATION ====================
  const validateForm = (): boolean => {
    let isValid = true;

    // Email validation
    if (!email.trim()) {
      setEmailError('E-posta adresi gerekli');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Geçerli bir e-posta adresi girin');
      isValid = false;
    } else {
      setEmailError('');
    }

    // Password validation
    if (!password.trim()) {
      setPasswordError('Şifre gerekli');
      isValid = false;
    } else if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      setPasswordError(`Şifre en az ${VALIDATION.PASSWORD_MIN_LENGTH} karakter olmalı`);
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  // ==================== HANDLERS ====================
  const handleLogin = async () => {
    if (!validateForm()) {
      await hapticFeedback.error();
      return;
    }

    const credentials = { email: email.trim(), password };

    try {
      await hapticFeedback.light();
      await login(credentials);

      // Login başarılı olduysa ve "Beni hatırla" seçiliyse, biometric credentials kaydet
      if (rememberMe && biometricAvailable) {
        try {
          await biometricService.saveCredentials(credentials);
          setBiometricEnabled(true);
        } catch (error) {
          console.error('❌ Failed to save biometric credentials:', error);
        }
      }

      await hapticFeedback.success();
    } catch (error: any) {
      console.error('[LOGIN SCREEN DEBUG] handleLogin catch', {
        message: error?.message,
        responseStatus: error?.response?.status,
        responseData: error?.response?.data,
      });
      await hapticFeedback.error();
      Alert.alert(
        'Giriş Hatası',
        error?.message || 'Giriş sırasında bir hata oluştu',
        [{ text: 'Tamam', style: 'default' }]
      );
    }
  };

  // Biometric ile giriş
  const handleBiometricLogin = async () => {
    try {
      setIsCheckingBiometric(true);
      await hapticFeedback.light();
      
      const credentials = await biometricService.quickLogin();
      if (credentials) {
        setEmail(credentials.email);
        setPassword(credentials.password);
        
        // Kısa bir gecikme sonrası login yap
        setTimeout(async () => {
          try {
            await login(credentials);
            await hapticFeedback.success();
          } catch (error: any) {
            // Biometric login başarısız, credentials'ı sil
            await biometricService.deleteCredentials();
            setBiometricEnabled(false);
            await hapticFeedback.error();
            Alert.alert(
              'Giriş Hatası',
              'Biometric giriş başarısız. Lütfen email ve şifrenizi girin.',
              [{ text: 'Tamam', style: 'default' }]
            );
          } finally {
            setIsCheckingBiometric(false);
          }
        }, 300);
      } else {
        setIsCheckingBiometric(false);
        await hapticFeedback.error();
      }
    } catch (error: any) {
      setIsCheckingBiometric(false);
      await hapticFeedback.error();
      console.error('❌ Biometric login error:', error);
    }
  };

  const handleSupport = async () => {
    try {
      await hapticFeedback.light();
      const url = `mailto:${APP_CONFIG.SUPPORT_EMAIL}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Destek', `Destek e-postası: ${APP_CONFIG.SUPPORT_EMAIL}\nTelefon: ${APP_CONFIG.SUPPORT_PHONE}`, [{ text: 'Tamam' }]);
      }
    } catch (error) {
      console.error('❌ Support contact error:', error);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Şifre Sıfırlama',
      'Şifrenizi sıfırlamak için sistem yöneticinizle iletişime geçin.',
      [{ text: 'Tamam', style: 'cancel' }]
    );
  };

  // ==================== RENDER ====================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={COLORS.primary[600]} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {/* ==================== HEADER ==================== */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={styles.appTitle}>{APP_CONFIG.NAME}</Text>
              <Text style={styles.appSubtitle}>{APP_CONFIG.COMPANY}</Text>
            </View>
          </View>

          {/* ==================== FORM ==================== */}
          <View style={styles.formContainer}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Firma Girişi</Text>
              <Text style={styles.formSubtitle}>
                Asansör bakım yönetim sisteminize hoş geldiniz
              </Text>

              {/* Global Error */}
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color={COLORS.error[500]} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>E-posta Adresi</Text>
                <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
                  <Ionicons 
                    name="mail-outline" 
                    size={20} 
                    color={emailError ? COLORS.error[500] : COLORS.gray[400]} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="ornek@firma.com"
                    placeholderTextColor={COLORS.gray[400]}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    returnKeyType="next"
                    editable={!isLoading}
                  />
                </View>
                {emailError ? (
                  <Text style={styles.fieldError}>{emailError}</Text>
                ) : null}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Şifre</Text>
                <View style={[styles.inputContainer, passwordError ? styles.inputError : null]}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={passwordError ? COLORS.error[500] : COLORS.gray[400]} 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Şifrenizi girin"
                    placeholderTextColor={COLORS.gray[400]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    returnKeyType="done"
                    blurOnSubmit={true}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                    disabled={isLoading}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={COLORS.gray[400]}
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? (
                  <Text style={styles.fieldError}>{passwordError}</Text>
                ) : null}
              </View>

              {/* Remember Me & Forgot Password */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  disabled={isLoading}
                >
                  <View style={[styles.checkbox, rememberMe ? styles.checkboxChecked : null]}>
                    {rememberMe && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                  <Text style={styles.rememberText}>Beni hatırla</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleForgotPassword}
                  disabled={isLoading}
                >
                  <Text style={styles.forgotText}>Şifremi unuttum</Text>
                </TouchableOpacity>
              </View>

              {/* Biometric Login Button */}
              {biometricAvailable && biometricEnabled && (
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                  disabled={isLoading || isCheckingBiometric}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={Platform.OS === 'ios' ? 'face-id' : 'finger-print'}
                    size={24}
                    color={COLORS.primary[600]}
                  />
                  <Text style={styles.biometricButtonText}>
                    {Platform.OS === 'ios' ? 'Face ID' : 'Parmak İzi'} ile Giriş Yap
                  </Text>
                </TouchableOpacity>
              )}

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, (isLoading || isCheckingBiometric) ? styles.loginButtonDisabled : null]}
                onPress={handleLogin}
                disabled={isLoading || isCheckingBiometric}
                activeOpacity={0.8}
              >
                {(isLoading || isCheckingBiometric) ? (
                  <View style={styles.loginButtonContent}>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={styles.loginButtonText}>
                      {isCheckingBiometric ? 'Biometric doğrulanıyor...' : 'Giriş yapılıyor...'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.loginButtonContent}>
                    <Ionicons name="log-in-outline" size={20} color="white" />
                    <Text style={styles.loginButtonText}>Giriş Yap</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Help Text */}
              <View style={styles.helpContainer}>
                <Text style={styles.helpText}>
                  Giriş sorunu yaşıyorsanız sistem yöneticinizle iletişime geçin
                </Text>
                <TouchableOpacity style={styles.supportButton} onPress={handleSupport}>
                  <Ionicons name="help-circle-outline" size={16} color={COLORS.primary[500]} />
                  <Text style={styles.supportText}>Destek Al</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ==================== FOOTER ==================== */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2026 {APP_CONFIG.COMPANY}
            </Text>
            <Text style={styles.versionText}>
              Sürüm {APP_CONFIG.VERSION}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Kvkk')} style={styles.kvkkLink}>
              <Text style={styles.kvkkLinkText}>KVKK & Gizlilik Politikası</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary[600],
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: screenHeight,
  },
  
  // Header styles
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.XXXL,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    color: COLORS.primary[100],
    textAlign: 'center',
  },

  // Form styles
  formContainer: {
    flex: 2,
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  formTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.XXL,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },

  // Error styles
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error[50],
    padding: 12,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.error[200],
  },
  errorText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.error[700],
    marginLeft: 8,
    flex: 1,
  },

  // Input styles
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    borderWidth: 2,
    borderColor: COLORS.gray[200],
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: COLORS.error[500],
    backgroundColor: COLORS.error[50],
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[900],
    paddingVertical: 0,
  },
  passwordToggle: {
    padding: 4,
  },
  fieldError: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.error[500],
    marginTop: 4,
    marginLeft: 4,
  },

  // Options row
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  rememberText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.gray[600],
  },
  forgotText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[600],
    fontWeight: '600',
  },

  // Biometric button
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary[50],
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    height: 56,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.primary[200],
  },
  biometricButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.primary[600],
    marginLeft: 12,
  },

  // Button styles
  loginButton: {
    backgroundColor: COLORS.primary[600],
    borderRadius: DIMENSIONS.BORDER_RADIUS,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: COLORS.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: COLORS.gray[400],
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: DIMENSIONS.FONT_SIZE.LG,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },

  // Help section
  helpContainer: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.gray[500],
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  supportText: {
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    color: COLORS.primary[500],
    fontWeight: '600',
    marginLeft: 4,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: DIMENSIONS.SCREEN_PADDING,
  },
  footerText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.primary[200],
    marginBottom: 4,
  },
  versionText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.primary[300],
  },
  kvkkLink: {
    marginTop: 8,
    paddingVertical: 4,
  },
  kvkkLinkText: {
    fontSize: DIMENSIONS.FONT_SIZE.XS,
    color: COLORS.primary[200],
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
