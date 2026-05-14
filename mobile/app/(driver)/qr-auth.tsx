import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QrScanner } from '../../src/components/qr/qr-scanner';
import { Button } from '../../src/components/ui/button';
import { Glyph } from '../../src/components/ui/glyph';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/stores/auth';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';
import { spacing } from '../../src/theme/tokens';

export default function QrAuthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const handleScan = async (data: string): Promise<boolean> => {
    try {
      await api.post('/auth/verify-qr', { qrData: data, driverId: user?.id });
      setTimeout(() => router.push('/(driver)/in-trip'), 1500);
      return true;
    } catch {
      return false;
    }
  };

  const handleMaxFailed = () => {};

  const handleOverride = async () => {
    try {
      await api.post('/journeys/override', { driverId: user?.id, reason: 'QR scan failed — manual override requested' });
      router.push('/(driver)/in-trip');
    } catch {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}>
          <Glyph k="chevL" size={20} color={colors.darkInk} />
        </Pressable>
        <Text style={styles.stepLabel}>STEP 5 OF 6</Text>
        <Pressable onPress={() => router.back()}>
          <Glyph k="x" size={20} color={colors.darkInk} />
        </Pressable>
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.sublabel}>DRIVER AUTHENTICATION</Text>
        <Text style={styles.title}>Scan your QR code</Text>
        <Text style={styles.instruction}>
          Hold your driver card QR code in front of the camera until you see the confirmation.
        </Text>
      </View>

      <View style={styles.scannerArea}>
        <QrScanner onScan={handleScan} onMaxFailed={handleMaxFailed} />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.alertCard}>
          <Glyph k="alert" size={16} color={colors.cond} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>QR unreadable?</Text>
            <Text style={styles.alertDesc}>You can request manual override from your Journey Manager. All overrides are logged.</Text>
          </View>
        </View>
        <Button title="Request manual override" variant="ghost" onPress={handleOverride} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.screenH, paddingVertical: 12 },
  stepLabel: { fontFamily: fonts.mono500, fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5 },
  titleSection: { paddingHorizontal: spacing.screenH, gap: 6, marginBottom: 24 },
  sublabel: { fontFamily: fonts.mono500, fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8 },
  title: { fontFamily: fonts.sans600, fontSize: 22, color: colors.darkInk },
  instruction: { fontFamily: fonts.sans400, fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 19 },
  scannerArea: { flex: 1 },
  footer: { paddingHorizontal: spacing.screenH, gap: 12 },
  alertCard: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  alertTitle: { fontFamily: fonts.sans600, fontSize: 12, color: colors.darkInk },
  alertDesc: { fontFamily: fonts.sans400, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
});
