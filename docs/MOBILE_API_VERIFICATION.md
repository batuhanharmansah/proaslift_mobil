# Mobil API Doğrulama Raporu

Son güncelleme: Bu doküman mobil formlar ve web API uyumluluğunun denetim sonuçlarını özetler.

## 1. Uygulanan Düzeltmeler

### 1.1 Issue Create – `requires_immediate_attention`
- **Dosya:** `asansor-mobile/src/screens/issues/IssueCreateScreen.tsx`
- **Değişiklik:** API payload'a `requires_immediate_attention: isUrgent` eklendi
- **Sebep:** Backend `IssueReportController@store` bu alanı bekliyor

### 1.2 Location API Endpoint Düzeltmesi
- **Dosya:** `asansor-mobile/src/constants/index.ts`
- **Eski:** `/api/location-map/location-checks/{id}`
- **Yeni:** `/api/location-map/maintenance/{id}/checks`
- **Sebep:** Web route yapısı `LocationMapController::getLocationChecks` ile uyumlu olacak şekilde güncellendi

## 2. Doğrulanmış API Uyumluluk Tablosu

| Form / İşlem | Mobil Endpoint | Web Controller | Durum |
|--------------|----------------|----------------|-------|
| Login | POST /api/mobile/auth/login | Mobile\AuthController@login | OK |
| Arıza Oluştur | POST /api/mobile/issues | Mobile\IssueReportController@store | OK |
| Bina Ekle | POST /api/mobile/buildings | Mobile\BuildingController@store | OK |
| Bakım Planla | POST /api/mobile/maintenance | Mobile\MaintenanceController@store | OK |
| Bakım Raporu | POST /api/mobile/maintenance/{id}/store-report | Mobile\MaintenanceController@storeReport | OK |
| İşe Başla | POST /api/mobile/maintenance/{id}/start | Mobile\MaintenanceController@start | OK |
| Bakım Düzenle | PUT /api/mobile/maintenance/{id} | Mobile\MaintenanceController@update | OK |
| Arıza Ata | POST /api/mobile/issues/{id}/assign | Mobile\IssueReportController@assign | OK |
| Arıza Başlat | POST /api/mobile/issues/{id}/start-work | Mobile\IssueReportController@startWork | OK |
| Arıza Tamamla | POST /api/mobile/issues/{id}/complete | Mobile\IssueReportController@complete | OK |
| Arıza → Bakım | POST /api/mobile/issues/{id}/create-maintenance | Mobile\IssueReportController@createMaintenance | OK |
| Etiket Tamamla | POST /api/mobile/elevator-labels/{id}/complete | Mobile\ElevatorLabelController@complete | OK |
| Etiket Mühürle | POST /api/mobile/elevator-labels/{id}/seal | Mobile\ElevatorLabelController@seal | OK |
| Etiket İptal | POST /api/mobile/elevator-labels/{id}/cancel | Mobile\ElevatorLabelController@cancel | OK |
| Personel Güncelle | PUT /api/mobile/employees/{id} | Mobile\EmployeeController@update | OK |
| Firma Profili | PUT /api/company/profile | CompanyController@updateProfile | OK |
| Konum Güncelle | POST /api/employee/location/update | EmployeeController@updateLocation | OK |
| Konum Kontrolleri | GET /api/location-map/maintenance/{id}/checks | LocationMapController@getLocationChecks | OK |

## 3. Finansal API

| İşlem | Endpoint | Durum |
|-------|----------|-------|
| Hesaplar CRUD | /api/mobile/financial/accounts | OK |
| İşlemler CRUD | /api/mobile/financial/transactions | OK |
| Alacaklar + Ödeme | /api/mobile/financial/receivables, receive-payment | OK |
| Borçlar + Ödeme | /api/mobile/financial/payables, make-payment | OK |
| Düzenli Ödemeler | /api/mobile/financial/recurring-payments | OK |
| Gün Sonu | /api/mobile/financial/day-end | OK |

## 4. Önerilen Manuel Testler

Aşağıdaki akışların gerçek cihaz veya simülatörde denenmesi önerilir:

1. **Finansal Formlar:** Hesaplar, işlemler, alacaklar, borçlar, düzenli ödemeler ekleme/düzenleme
2. **Konum Takibi:** Aktif iş ekranında konum güncelleme ve arrival/departure kontrolü
3. **Bildirimler:** Okundu işaretleme, tümünü okundu işaretleme

## 5. Bilinen Uyarılar

- **Location checks:** `/api/location-map/maintenance/{id}/checks` route'u `role:company_admin` gerektirir. Sadece admin kullanıcılar erişebilir; çalışan (employee) kullanıcılar 403 alabilir. Gerekirse backend tarafında çalışanlar için ayrı bir endpoint veya yetki güncellemesi düşünülebilir.
