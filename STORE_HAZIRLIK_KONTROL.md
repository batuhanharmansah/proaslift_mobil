# App Store / Google Play Hazırlık Kontrol Listesi

> Durum: 🔴 Bekliyor | 🟡 Kısmen | 🟢 Tamamlandı

---

## BLOK 1 — Kritik Kod Hataları

- [x] 🟢 authStore null crash (`response.data.user.employee`) — **Düzeltildi**
- [x] 🟢 AccountsScreen double `.data` extraction — **Düzeltildi**
- [x] 🟢 **MaintenanceDetailScreen — React Hook kuralı ihlali** — **Düzeltildi**
  - Tüm `useState` / `useCallback` / `useEffect` hook'ları erken return'ün üstüne taşındı
  - `loadMaintenanceDetail` başına `if (!maintenanceId) return` guard eklendi

---

## BLOK 2 — Console.log Temizliği (Üretim)

- [x] 🟢 authStore.ts — **Temizlendi**
- [x] 🟢 MaintenanceDetailScreen.tsx — **Temizlendi**
- [x] 🟢 AccountsScreen.tsx, TransactionsScreen.tsx, PayablesScreen.tsx, ReceivablesScreen.tsx — **Temizlendi**
- [x] 🟢 **App.tsx** — **Düzeltildi**
- [x] 🟢 **AppNavigator.tsx** — **Düzeltildi**
- [x] 🟢 **client.ts** `withRetry` — **Düzeltildi**

---

## BLOK 3 — app.json İzin Açıklamaları (iOS)

- [x] 🟢 `NSLocationWhenInUseUsageDescription` — Mevcut
- [x] 🟢 `NSLocationAlwaysUsageDescription` — Mevcut
- [x] 🟢 `NSFaceIDUsageDescription` — Mevcut
- [x] 🟢 **`NSCameraUsageDescription`** — **Eklendi**
- [x] 🟢 **`NSPhotoLibraryUsageDescription` + `NSPhotoLibraryAddUsageDescription`** — **Eklendi**

---

## BLOK 4 — formatCurrency Tekrarı

- [x] 🟢 **8 finansal ekranda `formatCurrency` tekrarı** — **Düzeltildi**
  - Tüm local tanımlar kaldırıldı, merkezi `utils/index.ts` sürümü import edildi

---

## BLOK 5 — Uygulama Kalitesi

- [x] 🟢 ErrorBoundary mevcut ve App.tsx içinde kullanılıyor
- [x] 🟢 Token yenileme (401) interceptor mevcut (client.ts)
- [x] 🟢 Ağ hata mesajı mevcut (bağlantı hatası)
- [x] 🟢 KVKK ekranı mevcut (`src/screens/legal/KvkkScreen.tsx`) ve navigation'a ekli
- [x] 🟢 Konum izni açıklamaları iOS/Android'de tanımlı
- [x] 🟢 Biometrik (Face ID / Fingerprint) izin açıklaması mevcut
- [x] 🟢 **Push notification izni** — **Düzeltildi**
  - `app.json`'a `expo-notifications` plugin eklendi
  - `NSUserNotificationsUsageDescription` iOS infoPlist'e eklendi
  - `getExpoPushToken()` içindeki placeholder projectId gerçek ID ile değiştirildi (`2415558a-...`)
  - `pushNotificationService.initialize()` zaten giriş sonrası AppNavigator'da çağrılıyor
- [x] 🟢 **Versiyon numarası** — **Güncellendi**
  - `version: "1.0.0"`, iOS `buildNumber: "1"`, Android `versionCode: 1`
- [x] 🟢 **Kullanıcı onay ekranı (ConsentScreen)** — **Eklendi**
  - `src/screens/legal/ConsentScreen.tsx` oluşturuldu
  - İlk açılışta KVKK + kullanım koşulları için iki ayrı checkbox
  - Her iki kutu işaretlenmeden "Kabul Et ve Devam Et" butonu pasif
  - Onay AsyncStorage `@consent_v1` anahtarına kaydedilir — uygulama ömrü boyunca bir kez gösterilir
  - KVKK Aydınlatma Metni linki KvkkScreen'e yönlendirir
  - `AppNavigator` consent kontrolü için AsyncStorage'ı okur, `initialRouteName` buna göre belirlenir

---

## BLOK 6 — Mağaza Gereksinimleri

- [ ] 🔴 **Destek e-posta adresi** — Her iki mağaza zorunlu kılıyor
- [ ] 🔴 **Privacy Policy URL** — Her iki mağaza zorunlu kılıyor (KvkkScreen uygulama içi, ayrıca web URL gerekli)
- [ ] 🟡 **App Store açıklaması / ekran görüntüleri** — Hazırlanmalı
- [ ] 🟡 **Google Play Data Safety formu** — Konum, kamera, biyometri kullanımı belirtilmeli

---

## İlerleme Özeti

| Blok | Durum |
|------|-------|
| Kritik Kod Hataları | 🟢 3/3 tamamlandı |
| Console.log Temizliği | 🟢 8/8 tamamlandı |
| iOS İzin Açıklamaları | 🟢 5/5 tamamlandı |
| formatCurrency Tekrarı | 🟢 Tamamlandı |
| Uygulama Kalitesi | 🟢 8/8 tamamlandı |
| Mağaza Gereksinimleri | 🔴 0/4 — Manuel gerekli |
