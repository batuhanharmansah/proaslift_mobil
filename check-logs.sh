#!/bin/bash
# 📋 LOG CHECKER SCRIPT
# React Native/Expo uygulaması log'larını toplar

echo "🔍 Log kontrolü başlatılıyor..."
echo ""

# 1. Metro bundler process kontrolü
echo "1️⃣ Metro Bundler Process:"
ps aux | grep -i "expo\|metro" | grep -v grep
echo ""

# 2. iOS Simulator log'ları (eğer simulator çalışıyorsa)
echo "2️⃣ iOS Simulator Log'ları:"
if command -v xcrun &> /dev/null; then
    echo "Simulator log'ları alınıyor..."
    xcrun simctl spawn booted log stream --level=debug --predicate 'processImagePath contains "Expo" OR processImagePath contains "asansor"' 2>&1 | head -50
else
    echo "xcrun bulunamadı"
fi
echo ""

# 3. React Native log'ları
echo "3️⃣ React Native Log'ları:"
echo "Metro bundler terminalinde 'r' tuşuna basarak reload yapın"
echo ""

# 4. Son hatalar
echo "4️⃣ Son Metro Bundler Hataları:"
if [ -f "expo-logs.txt" ]; then
    tail -100 expo-logs.txt | grep -i "error\|fail\|warn" | tail -20
else
    echo "expo-logs.txt dosyası bulunamadı"
fi
echo ""

# 5. Device log'ları (fiziksel cihaz için)
echo "5️⃣ Fiziksel Cihaz Log'ları için:"
echo "   iOS: idevicesyslog (Homebrew ile kurulabilir)"
echo "   Android: adb logcat"
echo ""

echo "✅ Log kontrolü tamamlandı"
