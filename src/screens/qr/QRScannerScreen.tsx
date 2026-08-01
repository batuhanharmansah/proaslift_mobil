import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { COLORS, DIMENSIONS, API_ENDPOINTS } from '../../constants';
import { apiClient } from '../../services/api/client';
import { RootStackParamList } from '../../types';
import AppHeader from '../../components/navigation/AppHeader';
import CustomSidebar from '../../components/navigation/CustomSidebar';

type QRScannerNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const QRScannerScreen = () => {
  const navigation = useNavigation<QRScannerNavigationProp>();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  const resetScanner = useCallback(() => {
    processingRef.current = false;
    setIsProcessing(false);
  }, []);

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (processingRef.current) {
        return;
      }
      const qrCode = result?.data?.trim();
      if (!qrCode) {
        return;
      }

      processingRef.current = true;
      setIsProcessing(true);

      try {
        const response = (await apiClient.post(API_ENDPOINTS.BUILDINGS_SEARCH_QR, {
          qr_code: qrCode,
        })) as { success?: boolean; data?: { id: number }; message?: string };

        if (response?.success && response?.data?.id) {
          navigation.navigate('BuildingDetail', { buildingId: response.data.id });
          resetScanner();
        } else {
          Alert.alert('Bulunamadı', response?.message || 'Bu QR koda ait bina bulunamadı.', [
            { text: 'Tamam', onPress: resetScanner },
          ]);
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'QR kod sorgulanırken bir hata oluştu.';
        Alert.alert('Hata', msg, [{ text: 'Tamam', onPress: resetScanner }]);
      }
    },
    [navigation, resetScanner]
  );

  const renderCameraContent = () => {
    if (!permission) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.permissionTitle}>Kamera İzni Gerekli</Text>
          <Text style={styles.permissionText}>
            QR kod tarayabilmek için kameraya erişim izni vermeniz gerekiyor.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>İzin Ver</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={isProcessing ? undefined : handleBarcodeScanned}
        />
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <Text style={styles.hintText}>QR kodu çerçeve içine getirin</Text>
          {isProcessing && (
            <View style={styles.processingBox}>
              <ActivityIndicator size="small" color={COLORS.white} />
              <Text style={styles.processingText}>Sorgulanıyor...</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomSidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <AppHeader
        title="QR Kod Tarayıcı"
        showBack
        onBackPress={() => navigation.goBack()}
        onMenuPress={() => setSidebarVisible(true)}
      />
      <View style={styles.content}>{renderCameraContent()}</View>
    </SafeAreaView>
  );
};

const SCAN_FRAME_SIZE = 260;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  content: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DIMENSIONS.SCREEN_PADDING,
    backgroundColor: COLORS.gray[50],
  },
  permissionTitle: {
    fontSize: DIMENSIONS.FONT_SIZE.XL,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
  },
  permissionButtonText: {
    color: COLORS.white,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
  },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: COLORS.primary[500],
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  hintText: {
    marginTop: 24,
    color: COLORS.white,
    fontSize: DIMENSIONS.FONT_SIZE.BASE,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
  },
  processingBox: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: DIMENSIONS.BORDER_RADIUS,
  },
  processingText: {
    color: COLORS.white,
    fontSize: DIMENSIONS.FONT_SIZE.SM,
    marginLeft: 8,
  },
});

export default QRScannerScreen;
