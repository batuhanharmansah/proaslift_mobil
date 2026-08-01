# 📱 Mobil Uygulama - Konum Takibi Kurulum Adımları

## ✅ Tamamlanan İşlemler

### 1. Type Definitions ✅
- `EmployeeLocation`, `LocationCheck`, `MapData` tipleri eklendi
- `MaintenanceScheduleWithLocation`, `ActiveEmployee` tipleri eklendi
- `src/types/index.ts` güncellendi

### 2. API Endpoints ✅
- `LOCATION_MAP`, `EMPLOYEE_LOCATION_UPDATE`, `LOCATION_CHECKS` endpoint'leri eklendi
- `src/constants/index.ts` güncellendi

### 3. Location Service ✅
- `src/services/location/LocationService.ts` oluşturuldu
- Konum izni kontrolü, konum alma, konum takibi fonksiyonları eklendi

### 4. Location API Service ✅
- `src/services/api/locationApi.ts` oluşturuldu
- Harita verileri, konum güncelleme, konum kontrolü API çağrıları eklendi

### 5. ActiveJobScreen (Çalışan Tarafı) ✅
- `src/screens/maintenance/ActiveJobScreen.tsx` oluşturuldu
- Konum takibi toggle'ı eklendi
- Konum kontrolü sonuçları görüntüleme eklendi
- **HARITA YOK** - sadece liste ve bilgiler

### 6. TodayJobsScreen (Admin Tarafı) ✅
- `src/screens/location/TodayJobsScreen.tsx` oluşturuldu
- Bugünün işleri listesi eklendi
- İstatistikler eklendi
- **HARITA YOK** - sadece liste

### 7. Navigation ✅
- `RootStackParamList` güncellendi (`ActiveJob`, `TodayJobs` eklendi)
- `AppNavigator.tsx` güncellendi (yeni screen'ler eklendi)

### 8. Dashboard Entegrasyonu ✅
- **Employee Dashboard**: Task'lara tıklanınca `ActiveJobScreen`'e gidiyor
- **Admin Dashboard**: "Bugünün İşleri" quick action butonu eklendi

---

## ⚠️ Yapılması Gerekenler

### 1. Expo Location Paketi Kurulumu

```bash
cd asansor-mobile
npx expo install expo-location
```

### 2. app.json İzinleri Güncelleme

`asansor-mobile/app.json` dosyasına şunları ekle:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Çalışanların konumunu takip etmek için konum erişimi gereklidir",
        "NSLocationAlwaysUsageDescription": "Arka planda konum takibi için konum erişimi gereklidir",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Konum takibi için konum erişimi gereklidir"
      }
    },
    "android": {
      "permissions": [
        "CAMERA",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION"
      ]
    }
  }
}
```

### 3. Backend API Endpoint'leri Kontrolü

Backend'de şu endpoint'lerin mevcut olduğundan emin ol:
- `POST /api/employee/location/update` (Çalışan konum güncelleme)
- `GET /api/location-map/data?date=YYYY-MM-DD` (Harita verileri)
- `GET /api/location-map/location-checks/{maintenanceScheduleId}` (Konum kontrolü sonuçları)

### 4. Test Senaryoları

#### Çalışan Tarafı:
1. Uygulamayı aç
2. Dashboard'da bugünün işlerini gör
3. Bir işe tıkla → `ActiveJobScreen` açılır
4. "Konum Takibi" toggle'ını aç → İzin istenir
5. İzin verildikten sonra konum takibi başlar
6. Her 30 saniyede bir konum güncellenir
7. Konum kontrolü sonuçları görüntülenir

#### Admin Tarafı:
1. Uygulamayı aç
2. Dashboard'da "Bugünün İşleri" butonuna tıkla → `TodayJobsScreen` açılır
3. Bugünün işleri listelenir
4. Her 30 saniyede bir veriler yenilenir
5. İş detayına tıklanınca maintenance detail'e gider

---

## 📝 Notlar

1. **Harita Görüntüsü YOK**: İstendiği gibi harita görüntüsü eklenmedi, sadece veriler gösteriliyor.

2. **Battery Optimization**: Konum takibi sadece aktif iş varken çalışır, iş bitince otomatik durdurulur.

3. **Offline Support**: Şu an için offline destek yok. İleride eklenebilir.

4. **Background Location**: iOS'ta background location için ek izinler gerekebilir. Android'de çalışır.

5. **API Entegrasyonu**: Tüm API endpoint'leri backend'de mevcut olmalı.

---

## 🚀 Çalıştırma

```bash
cd asansor-mobile
npm install  # veya yarn install
npx expo install expo-location  # Location paketini kur
npx expo start
```

iOS için:
```bash
npx expo run:ios
```

Android için:
```bash
npx expo run:android
```

---

## 🔍 Kontrol Listesi

- [ ] `expo-location` paketi kuruldu mu?
- [ ] `app.json` izinleri güncellendi mi?
- [ ] Backend API endpoint'leri çalışıyor mu?
- [ ] Çalışan tarafında konum izni isteniyor mu?
- [ ] Konum takibi başlatılabiliyor mu?
- [ ] Admin tarafında bugünün işleri gösteriliyor mu?
- [ ] Veriler her 30 saniyede bir yenileniyor mu?
- [ ] Navigation çalışıyor mu?
