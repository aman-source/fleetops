import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { MapboxView } from '../../src/components/map/mapbox-view';
import { Glyph } from '../../src/components/ui/glyph';
import { subscribe } from '../../src/lib/ws';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';

const STOPS = [
  { name: 'Muscat HQ', time: '06:00', state: 'next', desc: 'you + 1 board' },
  { name: 'Athaibah camp', time: '06:14', state: 'pending', desc: '2 board' },
  { name: 'Bidbid PIT', time: '07:35', state: 'pending', desc: '1 board' },
  { name: 'Marmul gate', time: '13:45', state: 'pending', desc: 'drop · destination' },
];

export default function MyTripScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [vehicle, setVehicle] = useState({ lat: 23.59, lon: 58.42, heading: 0 });
  const [eta] = useState('4 min away');

  useEffect(() => {
    const unsub = subscribe('journey:current:live', (data: unknown) => {
      const d = data as { lat?: number; lon?: number; heading?: number };
      if (d.lat) setVehicle((prev) => ({ ...prev, ...d }));
    });
    return unsub;
  }, []);

  const handleShareEta = async () => {
    if (await Sharing.isAvailableAsync()) {
      // In production: generate share URL
    }
  };

  return (
    <View style={styles.container}>
      <MapboxView center={[vehicle.lon, vehicle.lat]} zoom={12} vehiclePosition={vehicle} />

      <Pressable style={[styles.backPill, { top: insets.top + 16 }]} onPress={() => router.back()}>
        <Glyph k="chevL" size={16} color={colors.ink0} />
        <Text style={styles.backText}>My trip</Text>
      </Pressable>

      <Pressable style={[styles.sharePill, { top: insets.top + 16 }]} onPress={handleShareEta}>
        <Glyph k="share" size={14} color={colors.ink0} />
        <Text style={styles.shareText}>Share ETA</Text>
      </Pressable>

      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 92 }]}>
        <View style={styles.handle} />

        <Text style={styles.statusLabel}>SHUTTLE IS ON THE WAY</Text>
        <Text style={styles.etaText}>{eta}</Text>
        <Text style={styles.pickupText}>Picking up at Muscat HQ · Building 4 lobby</Text>

        <View style={styles.driverCard}>
          <View style={styles.driverAvatar} />
          <View style={styles.driverInfo}>
            <View style={styles.driverRow}>
              <Text style={styles.driverName}>Daoud Al-Busaidi</Text>
              <Text style={styles.driverRating}>★ 4.92 · 3 trips</Text>
            </View>
            <Text style={styles.driverVehicle}>Toyota Coaster · 14 seats</Text>
            <Text style={styles.driverPlate}>Plate 34-D-1129</Text>
          </View>
          <Pressable style={styles.phoneBtn} onPress={() => Linking.openURL('tel:+96812345678')}>
            <Glyph k="phone" size={16} color={colors.white} />
          </Pressable>
        </View>

        <Text style={styles.stopsLabel}>STOPS ON YOUR ROUTE</Text>
        {STOPS.map((stop, i) => (
          <View key={i} style={styles.stopRow}>
            <View style={styles.stopTimeline}>
              <View style={[styles.stopDot, stop.state === 'next' && styles.stopDotNext]} />
              {i < STOPS.length - 1 && <View style={styles.stopLine} />}
            </View>
            <View style={styles.stopInfo}>
              <View style={styles.stopHeader}>
                <Text style={styles.stopName}>{stop.name}</Text>
                <Text style={styles.stopTime}>{stop.time}</Text>
              </View>
              <Text style={styles.stopDesc}>{stop.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backPill: {
    position: 'absolute', left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20,
  },
  backText: { fontFamily: fonts.sans500, fontSize: 13, color: colors.ink0 },
  sharePill: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: colors.white, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  shareText: { fontFamily: fonts.sans500, fontSize: 12, color: colors.ink0 },
  bottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 14, paddingTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
  },
  handle: { width: 36, height: 4, backgroundColor: colors.lineStrong, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  statusLabel: { fontFamily: fonts.mono500, fontSize: 11, color: colors.ink3, letterSpacing: 0.5 },
  etaText: { fontFamily: fonts.mono500, fontSize: 28, color: colors.ink0, letterSpacing: -0.5, marginTop: 2 },
  pickupText: { fontFamily: fonts.sans400, fontSize: 12, color: colors.ink3, marginTop: 2 },
  driverCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg3, borderRadius: 12, padding: 12, marginTop: 14 },
  driverAvatar: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.line },
  driverInfo: { flex: 1, gap: 2 },
  driverRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverName: { fontFamily: fonts.sans600, fontSize: 13, color: colors.ink0 },
  driverRating: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink3 },
  driverVehicle: { fontFamily: fonts.sans400, fontSize: 11.5, color: colors.ink3 },
  driverPlate: { fontFamily: fonts.mono500, fontSize: 11, color: colors.ink0 },
  phoneBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.ink0, alignItems: 'center', justifyContent: 'center' },
  stopsLabel: { fontFamily: fonts.mono500, fontSize: 11, color: colors.ink3, letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
  stopRow: { flexDirection: 'row', gap: 12 },
  stopTimeline: { alignItems: 'center', width: 12 },
  stopDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink4 },
  stopDotNext: { backgroundColor: colors.go, shadowColor: colors.go, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4 },
  stopLine: { width: 1, flex: 1, backgroundColor: colors.ink4, marginVertical: 2, minHeight: 24 },
  stopInfo: { flex: 1, paddingBottom: 16 },
  stopHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  stopName: { fontFamily: fonts.sans500, fontSize: 13, color: colors.ink0 },
  stopTime: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink3 },
  stopDesc: { fontFamily: fonts.sans400, fontSize: 11, color: colors.ink4, marginTop: 1 },
});
