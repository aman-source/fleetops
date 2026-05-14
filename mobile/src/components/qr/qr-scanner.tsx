import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Glyph } from '../ui/glyph';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

type ScanState = 'scanning' | 'detected' | 'verifying' | 'authenticated' | 'failed';

interface QrScannerProps {
  onScan: (data: string) => Promise<boolean>;
  maxAttempts?: number;
  onMaxFailed: () => void;
}

export function QrScanner({ onScan, maxAttempts = 3, onMaxFailed }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>('scanning');
  const [attempts, setAttempts] = useState(0);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { requestPermission(); }, []);

  useEffect(() => {
    if (state === 'scanning') {
      const anim = Animated.loop(
        Animated.timing(pulseAnim, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true })
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.stopAnimation();
    }
  }, [state]);

  const handleBarcode = async (result: { data: string }) => {
    if (state !== 'scanning') return;
    setState('detected');
    setTimeout(() => setState('verifying'), 500);

    const success = await onScan(result.data);
    if (success) {
      setState('authenticated');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= maxAttempts) {
        setState('failed');
        onMaxFailed();
      } else {
        setState('scanning');
      }
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera permission required for QR scan</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {state === 'scanning' && (
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcode}
        />
      )}

      <View style={styles.overlay}>
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <View style={styles.statusPill}>
          {state === 'scanning' && (
            <>
              <Animated.View style={[styles.blinkDot, { opacity: pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.3, 1] }) }]} />
              <Text style={styles.statusText}>SCANNING{attempts > 0 ? ` \u00b7 ${attempts} of ${maxAttempts}` : ''}</Text>
            </>
          )}
          {state === 'detected' && <Text style={styles.statusText}>QR DETECTED</Text>}
          {state === 'verifying' && <Text style={styles.statusText}>VERIFYING...</Text>}
          {state === 'authenticated' && (
            <>
              <Glyph k="check" size={14} color={colors.go} />
              <Text style={[styles.statusText, { color: colors.go }]}>AUTHENTICATED</Text>
            </>
          )}
          {state === 'failed' && (
            <>
              <Glyph k="x" size={14} color={colors.nogo} />
              <Text style={[styles.statusText, { color: colors.nogo }]}>FAILED — MAX ATTEMPTS</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.darkBg },
  permText: { color: colors.darkInk, fontFamily: fonts.sans400, fontSize: 14 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  viewfinder: { width: 220, height: 220, position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: colors.darkInk },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 32,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(74,144,255,0.15)', borderWidth: 1, borderColor: 'rgba(74,144,255,0.3)',
  },
  blinkDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.info },
  statusText: { fontFamily: fonts.mono500, fontSize: 11, color: colors.darkInk, letterSpacing: 0.5 },
});
