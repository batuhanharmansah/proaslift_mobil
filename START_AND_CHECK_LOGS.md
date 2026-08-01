# 🔍 LOG KONTROLÜ İÇİN ADIMLAR

## 1. Metro Bundler Terminalinde

Metro bundler çalışıyor terminal penceresinde şunu yapın:

**iOS Simulator'de açmak için:**
- Terminal'de `i` tuşuna basın
- Veya simulator'de uygulamayı manuel olarak açın

## 2. Uygulama Açıldıktan Sonra

Metro bundler terminalinde şu log'ları görmelisiniz:

```
🚀 Asansör Mobil App Started
📱 App component mounted
🔄 App component rendering...
🔍 AppNavigator: Initializing, checking auth status...
```

**Eğer hata varsa:**
```
❌ App component error: [error message]
❌ AppNavigator: checkAuthStatus failed: [error message]
❌ AppNavigator: NavigationContainer error: [error message]
```

## 3. Eğer Hiç Log Gelmiyorsa

Uygulama başlatılmıyor demektir. Şunları kontrol edin:

1. **Simulator'de uygulama açıldı mı?**
   - Simulator'de asansor uygulamasını bulun ve açın

2. **Development build yüklü mü?**
   ```bash
   eas build --platform ios --profile preview
   ```

3. **Metro bundler'a bağlanıyor mu?**
   - Metro bundler terminalinde "Connected" mesajı görünmeli

## 4. Debug Mode

Metro bundler terminalinde:
- `j` tuşuna basarak Chrome DevTools'u açın
- Console sekmesinde tüm log'ları görebilirsiniz

## 5. Manuel Log Kontrolü

Terminal'de çalıştırın:
```bash
cd asansor-mobile
npx expo start --clear
```

Sonra simulator'de uygulamayı açın ve terminal'deki log'ları kontrol edin.
