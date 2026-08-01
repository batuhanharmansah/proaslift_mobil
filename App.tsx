// 🚀 ENTERPRISE MOBILE APP - ASANSÖR YÖNETİM SİSTEMİ
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { MonitoringService } from './src/services/monitoring/MonitoringService';

// Global JS hata yakalayıcı: React render ağacı dışında (ör. event handler,
// timer, promise) oluşan yakalanmamış hataları da sistem sağlığı sayfasına raporlar.
const globalErrorHandler = (error: Error, isFatal?: boolean) => {
  MonitoringService.reportError(error?.message || String(error), {
    type: 'mobile_crash',
    severity: isFatal ? 'critical' : 'warning',
    stack: error?.stack,
  });

  originalGlobalHandler?.(error, isFatal);
};

// @ts-ignore - ErrorUtils, React Native global'ında tanımlıdır ama tip tanımı yoktur
const originalGlobalHandler = global.ErrorUtils?.getGlobalHandler?.();
// @ts-ignore
global.ErrorUtils?.setGlobalHandler?.(globalErrorHandler);

export default function App() {
  return (
    <ErrorBoundary>
      <StatusBar style="light" backgroundColor="#2563eb" />
      <AppNavigator />
    </ErrorBoundary>
  );
}
