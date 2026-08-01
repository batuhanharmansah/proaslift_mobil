#!/bin/bash
# 📱 DEVICE LOG COLLECTOR
# iOS ve Android cihaz log'larını toplar

echo "📱 Cihaz log'ları toplanıyor..."
echo ""

# iOS Device Log'ları
if command -v idevicesyslog &> /dev/null; then
    echo "📱 iOS Cihaz Log'ları (son 100 satır):"
    idevicesyslog 2>&1 | grep -i "expo\|asansor\|error\|fail" | tail -100 > ios-device-logs.txt
    echo "Log'lar ios-device-logs.txt dosyasına kaydedildi"
elif command -v xcrun &> /dev/null; then
    echo "📱 iOS Simulator Log'ları:"
    xcrun simctl spawn booted log stream --level=debug --predicate 'processImagePath contains "Expo" OR processImagePath contains "asansor" OR subsystem == "com.facebook.react"' 2>&1 | tee ios-simulator-logs.txt &
    SIMULATOR_PID=$!
    echo "Simulator log'ları toplanıyor... (PID: $SIMULATOR_PID)"
    echo "Durdurmak için: kill $SIMULATOR_PID"
    sleep 5
    kill $SIMULATOR_PID 2>/dev/null
    if [ -f "ios-simulator-logs.txt" ]; then
        tail -50 ios-simulator-logs.txt
    fi
else
    echo "⚠️ iOS log araçları bulunamadı"
fi

echo ""
echo "✅ Log toplama tamamlandı"
