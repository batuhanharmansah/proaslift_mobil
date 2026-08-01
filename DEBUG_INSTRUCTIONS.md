# 🐛 DEBUG INSTRUCTIONS - Beyaz Ekran Sorunu

## 1. Metro Bundler Terminal Log'ları

Metro bundler'ın çalıştığı terminal penceresinde şu log'ları arayın:

```
🚀 Asansör Mobil App Started
🔍 AppNavigator: Initializing, checking auth status...
🔐 Auth state changed: { isAuthenticated: false, isEmployee: false }
⏳ AppNavigator: Loading...
✅ AppNavigator: Rendering NavigationContainer
```

**Hata varsa şöyle görünür:**
```
❌ AppNavigator: checkAuthStatus failed: [error message]
❌ AppNavigator: NavigationContainer error: [error message]
```

## 2. React Native Debugger

1. Chrome'da `chrome://inspect` açın
2. "Open dedicated DevTools for React Native" tıklayın
3. Console sekmesinde tüm log'ları göreceksiniz

## 3. iOS Simulator Log'ları

Terminal'de çalıştırın:
```bash
xcrun simctl spawn booted log stream --level=debug --predicate 'processImagePath contains "Expo" OR processImagePath contains "asansor"'
```

## 4. ErrorBoundary Hata Ekranı

Eğer uygulama açılıyorsa ama ErrorBoundary hata ekranı gösteriyorsa:
- Ekrandaki hata mesajını not edin
- "Hata Detayları" bölümündeki stack trace'i kontrol edin

## 5. Xcode Console (iOS için)

1. Xcode'u açın
2. Window > Devices and Simulators
3. Cihazınızı seçin
4. "Open Console" tıklayın
5. Uygulamayı açın ve log'ları izleyin

## 6. En Hızlı Yöntem

Metro bundler terminalinde şunu arayın:
- `error`
- `fail`
- `exception`
- `undefined`
- `null`

Bu kelimeleri içeren satırları bulun ve paylaşın.
