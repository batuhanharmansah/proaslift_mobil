# 🧪 LOCAL TEST ADIMLARI

## 1. Metro Bundler'ı Başlat

```bash
cd asansor-mobile
npx expo start --clear
```

## 2. iOS Simulator'de Aç

Metro bundler terminalinde:
- `i` tuşuna basın (iOS simulator'de açmak için)

VEYA

Simulator'de uygulamayı manuel olarak açın.

## 3. Beklenen Sonuç

**Eğer useAuth çalışıyorsa:**
- Yeşil ekranda "✅ Navigation Works!" görünmeli
- Veya loading ekranı görünmeli (auth check yapılıyorsa)

**Eğer useAuth hatası varsa:**
- Kırmızı ekranda "❌ useAuth Error" görünmeli
- Metro bundler terminalinde hata mesajı görünmeli

## 4. Metro Bundler Terminalinde Kontrol Et

Şu log'ları arayın:
```
🔍 AppNavigator: Testing useAuth hook...
✅ useAuth hook works!
🔍 AppNavigator: Calling checkAuthStatus...
```

VEYA

```
❌ AppNavigator: useAuth error: [error message]
```

## 5. Sonuç

Test sonucunu paylaşın:
- Ne görüyorsunuz?
- Metro bundler terminalinde ne yazıyor?
