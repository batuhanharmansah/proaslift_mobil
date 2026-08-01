# IPA Dosyasını Alma

## 1. Yerel build (IPA doğrudan bilgisayarına iner)

```bash
cd asansor-mobile
eas build --platform ios --profile production --local
```

- Build bittikten sonra `.ipa` dosyası proje klasöründe veya `EAS_LOCAL_BUILD_ARTIFACTS_DIR` ile belirttiğin dizinde oluşur.
- Varsayılan çıktı: `./build-*.ipa` veya `./ios/build/` benzeri bir konum (EAS sürümüne göre değişir). Terminal çıktısında tam yol yazar.

İstersen çıktı klasörünü sabitlemek için:

```bash
EAS_LOCAL_BUILD_ARTIFACTS_DIR=./artifacts eas build --platform ios --profile production --local
```

IPA dosyası `./artifacts` içinde olur.

---

## 2. Cloud build sonrası indirme (EAS’ta build aldıysan)

1. Build’i çalıştır:
   ```bash
   eas build --platform ios --profile production
   ```
2. Build tamamlanınca terminalde çıkan linke gir (örn. `https://expo.dev/accounts/.../builds/...`).
3. Açılan sayfada **Download** / **Artifacts** bölümünden `.ipa` dosyasını indir.

Not: EAS artifact’ları **30 gün** saklar; süresi dolan build’in .ipa’sı indirilemez.

---

## 3. İndirdiğin IPA’yı TestFlight’a göndermek

Yerel .ipa dosyası varsa:

```bash
eas submit --platform ios --profile production --path ./path/to/your-app.ipa
```

Örnek (artifact’lar `./artifacts` içindeyse):

```bash
eas submit --platform ios --profile production --path ./artifacts/YourApp.ipa
```
