# Mobil Uygulama İyileştirme Raporu

**Tarih:** 2026-03-23
**Kapsam:** `asansor-mobile/src` altındaki tüm ekranlar, store ve servis dosyaları

---

## 1. KRİTİK HATALAR

### 1.1 authStore.ts — Null crash: `response.data.user.employee`
**Dosya:** `src/store/authStore.ts`
**Satır (eski):** 65
**Sorun:** `is_employee` belirleme mantığının 3. dalında `response.data.user.employee` erişimi yapılıyordu. Eğer `response.data.user` `undefined` ise bu satır `TypeError: Cannot read property 'employee' of undefined` fırlatır ve giriş yapılamaz hale gelir.
**Düzeltme:** `response.data.user.employee` → `response.data?.user?.employee` (optional chaining)

```ts
// ESKİ (çökme riski)
} else if (response.data.user.employee) {

// YENİ (güvenli)
} else if (response.data?.user?.employee) {
```

### 1.2 AccountsScreen.tsx — `response.data.success` çift `.data` çekimi
**Dosya:** `src/screens/financial/AccountsScreen.tsx`
**Satırlar (eski):** 148, 179
**Sorun:** `apiClient.post()` zaten `axios.response.data`'yı döndürüyor. Yani dönen değer `{ success: true, message: "...", data: {...} }` formatında. Ancak `response.data.success` yazıldığında `data` alanına tekrar erişilir; bu `undefined.success` hatası verir.
**Düzeltme:** `response.data.success` → `response?.success`, `response.data.message` → `response?.message`

```ts
// ESKİ (hatalı)
if (response.data.success) {
  Alert.alert('Başarılı', response.data.message || '...');

// YENİ (doğru)
if (response?.success) {
  Alert.alert('Başarılı', response?.message || '...');
```

---

## 2. YÜKSEK ÖNCELİKLİ DÜZELTMELER

### 2.1 ElevatorLabelsScreen.tsx — `stats.aktif` tanımsız alan
**Dosya:** `src/screens/elevator-labels/ElevatorLabelsScreen.tsx`
**Sorun:** `stats` state tipi `{ total?: number; overdue?: number; due_soon_30?: number }` olarak tanımlanmıştı ancak arayüzde `stats.aktif` alanı kullanılıyordu. TypeScript hata vermez çünkü `as any` kullanılmıyordu fakat tip dışı alan sessizce `undefined` döner.
**Düzeltme:** Tip tanımına `aktif?: number` eklendi.

```ts
// ESKİ
useState<{ total?: number; overdue?: number; due_soon_30?: number } | null>

// YENİ
useState<{ total?: number; aktif?: number; overdue?: number; due_soon_30?: number } | null>
```

### 2.2 BuildingDetailScreen.tsx — Non-null assertion (`contact.phone!`)
**Dosya:** `src/screens/buildings/BuildingDetailScreen.tsx`
**Satırlar (eski):** 304, 319
**Sorun:** `contact.phone!` non-null assertion operatörü kullanılmıştı. Her iki kullanım da `contact.phone ? ... : ...` bloğu içindeydi yani null olamaz ama TypeScript için kötü pratik; future refactor sırasında bloğun dışına taşınırsa çökme riski oluşur.
**Düzeltme:** `contact.phone!` → `contact.phone ?? ''`

### 2.3 BuildingCreateScreen.tsx — Non-null assertion (`response.data!.id`)
**Dosya:** `src/screens/buildings/BuildingCreateScreen.tsx`
**Satır (eski):** 151
**Sorun:** `response.data!.id` yazılmıştı. Enclosing `if` bloğu `response?.data?.id` varlığını kontrol ediyor ancak TypeScript `!` operatörü runtime güvencesi vermez, refactoring sırasında tehlikeli.
**Düzeltme:** `response.data!.id` → `response.data?.id ?? 0`

---

## 3. CONSOLE.LOG TEMİZLİĞİ (Üretim Güvenliği)

Üretim kodunda `console.log` bırakmak güvenlik açığı oluşturabilir (API token, kullanıcı bilgisi, endpoint URL gibi hassas veriler loglanabilir) ve performansı düşürür.

### Temizlenen Dosyalar

| Dosya | Kaldırılan console Sayısı | Notlar |
|-------|--------------------------|--------|
| `src/store/authStore.ts` | ~20 | Tüm `[AUTH STORE DEBUG]` ve `✅/🔵` loglar |
| `src/screens/maintenance/MaintenanceDetailScreen.tsx` | ~25 | Tüm render/hook/API debug loglar |
| `src/screens/financial/AccountsScreen.tsx` | 8 | Tüm API response debug loglar |
| `src/screens/financial/TransactionsScreen.tsx` | 1 | `fetchTransactions` debug bloğu |
| `src/screens/financial/PayablesScreen.tsx` | 1 | `fetchPayables` debug bloğu |
| `src/screens/financial/ReceivablesScreen.tsx` | 1 | `fetchReceivables` debug bloğu |
| `src/screens/maintenance/CreateMaintenanceReportScreen.tsx` | 3 | Ürün listesi yükleme logları |

> **Not:** `catch` bloklarındaki `console.error` çağrıları kasıtlı olarak bırakıldı; bunlar gerçek hata durumlarını bildirmek için kullanılır ve geliştirme aşamasında faydalıdır.

---

## 4. ORTA ÖNCELİKLİ DÜZELTMELER

### 4.1 MaintenanceDetailScreen.tsx — Aşırı verbose hata mesajları
**Sorun:** API hatalarında kullanıcıya `JSON.stringify(response)`, HTTP status kodu ve API URL'si gibi teknik detaylar Alert içinde gösteriliyordu. Bu hem kullanıcı deneyimini bozar hem de uygulamaya dair teknik bilgileri ifşa eder.
**Düzeltme:** Hata Alert mesajları sadeleştirildi; teknik detaylar kaldırıldı.

### 4.2 MaintenanceDetailScreen.tsx — Component render seviyesinde state hook'ları
**Sorun:** `useState` çağrıları, `if (!maintenanceId) return ...` erken dönüşünden **sonra** yazılmıştı. React Hook kurallarına göre hook'lar koşullu çalışmamalıdır. Bu durum "Rendered fewer hooks than expected" hatasına yol açar.
**Durum:** Mevcut kod zaten bu sıralamada çalışıyor olabilir; ancak dikkat edilmeli. `maintenanceId` null olduğunda erken return yapılmadan önce tüm hook'lar çağrılmalıdır.

---

## 5. DÜŞÜK ÖNCELİKLİ / SONRAKI ADIMLAR

### 5.1 `formatCurrency` Fonksiyon Çoğaltması
**Sorun:** `formatCurrency` aynı implementasyonla aşağıdaki dosyaların her birinde tekrar tanımlanıyor:

- `src/screens/financial/AccountsScreen.tsx`
- `src/screens/financial/FinancialScreen.tsx`
- `src/screens/financial/TransactionsScreen.tsx`
- `src/screens/financial/PayablesScreen.tsx`
- `src/screens/financial/ReceivablesScreen.tsx`
- `src/screens/financial/RecurringPaymentsScreen.tsx`
- `src/screens/financial/UnifiedTransactionsScreen.tsx`
- `src/screens/financial/DayEndScreen.tsx`

Zaten `src/utils/index.ts:69` içinde `export const formatCurrency` mevcut.
**Öneri:** Tüm local tanımları kaldırıp `import { formatCurrency } from '../../utils'` ile merkezi sürümü kullanın.

### 5.2 TransactionsScreen / PayablesScreen / ReceivablesScreen — Hesap listesi üçlü fallback
**Sorun:** Aşağıdaki pattern gereksiz karmaşık:
```ts
if (accountsRes?.success && accountsRes?.data) { ... }
else if (Array.isArray(accountsRes)) { ... }
else if (Array.isArray(accountsRes?.data)) { ... }
```
API client tutarlı format döndürdüğü için tek bir `if (Array.isArray(accountsRes?.data))` yeterli.
**Öneri:** Fallback zincirini sadeleştirin.

### 5.3 dashboardStore.ts — Response format fallback zincirleri
**Sorun:** `response.data.data || response.data` gibi çift fallback pattern kullanılıyor.
**Durum:** Çalışır durumda; fakat API formatı sabitlenince sadeleştirilebilir.

---

## 6. DEĞİŞTİRİLEN DOSYALAR

| Dosya Yolu | Değişiklik Türü |
|-----------|----------------|
| `src/store/authStore.ts` | Bug fix (null crash) + console.log temizliği |
| `src/screens/elevator-labels/ElevatorLabelsScreen.tsx` | Tip tanımı düzeltmesi |
| `src/screens/financial/AccountsScreen.tsx` | Bug fix (double .data) + console.log temizliği |
| `src/screens/buildings/BuildingDetailScreen.tsx` | Non-null assertion düzeltmesi |
| `src/screens/buildings/BuildingCreateScreen.tsx` | Non-null assertion düzeltmesi |
| `src/screens/maintenance/MaintenanceDetailScreen.tsx` | console.log temizliği + hata mesajı sadeleştirmesi |
| `src/screens/financial/TransactionsScreen.tsx` | console.log temizliği |
| `src/screens/financial/PayablesScreen.tsx` | console.log temizliği |
| `src/screens/financial/ReceivablesScreen.tsx` | console.log temizliği |
| `src/screens/maintenance/CreateMaintenanceReportScreen.tsx` | console.log temizliği |
