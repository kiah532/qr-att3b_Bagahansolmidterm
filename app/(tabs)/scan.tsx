import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { registerAttendance } from '@/lib/attendance';
import { useAuth } from '@/lib/auth';

export default function ScanScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Header title="Scan QR Code" />
        <View style={styles.centered}>
          <Text style={styles.message}>Camera permission is required.</Text>
          <AppButton
            theme="primary"
            title="Grant Permission"
            onPress={requestPermission}
          />
        </View>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    if (!user) {
      setStatusMessage('You must be logged in to register attendance.');
      return;
    }

    const result = await registerAttendance(data, user.id);
    if (result.success) {
      setStatusMessage(`Success: ${result.message}`);
    } else {
      setStatusMessage(`Failed: ${result.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Scan QR Code" />
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
      </View>
      {statusMessage && (
        <Text style={styles.statusText}>{statusMessage}</Text>
      )}
      {scanned && (
        <View style={styles.buttonContainer}>
          <AppButton
            theme="primary"
            title="Scan Again"
            onPress={() => {
              setScanned(false);
              setStatusMessage(null);
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  cameraContainer: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 20,
  },
  buttonContainer: {
    marginTop: 20,
  },
});