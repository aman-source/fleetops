import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { MapboxView } from '../../src/components/map/mapbox-view';
import { BottomSheetWrapper } from '../../src/components/ui/bottom-sheet-wrapper';
import { Pill } from '../../src/components/ui/pill';
import { Glyph } from '../../src/components/ui/glyph';
import { Button } from '../../src/components/ui/button';
import { subscribe } from '../../src/lib/ws';
import { api } from '../../src/lib/api';
import { colors } from '../../src/theme/colors';
import { fonts, type as typ } from '../../src/theme/typography';
import { spacing } from '../../src/theme/tokens';

export default function InTripScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sheetRef = useRef<GorhomBottomSheet>(null);
  const [vehicle, setVehicle] = useState({ lat: 18.85, lon: 55.78, speed: 0, heading: 0, fuel: 64 });
  const [journey, setJourney] = useState<any>(null);

  useEffect(() => {
    const unsub = subscribe('journey:current:live', (data: any) => {
      if (data.lat) setVehicle((prev) => ({ ...prev, ...data }));
    });
    return unsub;
  }, []);

  const handleSOS = () => {
    api.post('/events', {
      eventType: 'panic',
      severity: 'critical',
      lat: vehicle.lat,
      lon: vehicle.lon,
      description: 'SOS activated by driver',
    });
  };

  return (
    <View style={styles.container}>
      <MapboxView
        center={[vehicle.lon, vehicle.lat]}
        zoom={11}
        vehiclePosition={vehicle}
      />

      {/* Top floating card — next waypoint */}
      <View style={[styles.waypointCard, { top: insets.top + 16 }]}>
        <View>
          <Text style={styles.waypointLabel}>NEXT WAYPOINT</Text>
          <Text style={styles.waypointName}>{journey?.destination ?? 'Nimr-2 main camp'}</Text>
        </View>
        <View style={styles.waypointMeta}>
          <Text style={styles.waypointDist}>40 km</Text>
          <Text style={styles.waypointEta}>ETA 16:50</Text>
        </View>
      </View>

      {/* Speed badge */}
      <View style={[styles.speedBadge, { bottom: 300 }]}>
        <Text style={styles.speedValue}>{vehicle.speed}</Text>
        <Text style={styles.speedUnit}>KM/H</Text>
      </View>

      {/* Status stack — right side */}
      <View style={[styles.statusStack, { bottom: 310 }]}>
        <View style={[styles.statusDot, { borderColor: colors.go }]}>
          <Glyph k="qr" size={14} color={colors.go} />
        </View>
        <View style={[styles.statusDot, { borderColor: colors.go }]}>
          <Glyph k="signal" size={14} color={colors.go} />
        </View>
        <View style={[styles.statusDot, { borderColor: colors.go }]}>
          <Glyph k="shield" size={14} color={colors.go} />
        </View>
      </View>

      {/* Bottom sheet */}
      <BottomSheetWrapper ref={sheetRef} snapPoints={['35%', '65%']}>
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.journeyId}>{journey?.journeyNo ?? 'JM-25-04018'} · ACTIVE</Text>
            <Text style={styles.routeTitle}>{journey?.origin ?? 'Marmul'} → {journey?.destination ?? 'Nimr-2'}</Text>
          </View>
          <Pill status="active" label="ON ROUTE" />
        </View>

        <View style={styles.statGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>PASSENGERS</Text>
            <Text style={[styles.statValue, { color: colors.go }]}>4 / 4</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>FUEL</Text>
            <Text style={styles.statValue}>{vehicle.fuel}%</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TIME LEFT</Text>
            <Text style={styles.statValue}>0:28</Text>
          </View>
        </View>

        <View style={styles.sheetActions}>
          <View style={{ flex: 1 }}>
            <Button title="Report defect" variant="secondary" onPress={() => {}} icon={<Glyph k="alert" size={16} color={colors.ink0} />} />
          </View>
          <Pressable style={styles.sosButton} onLongPress={handleSOS} delayLongPress={3000}>
            <Text style={styles.sosText}>SOS</Text>
          </Pressable>
        </View>
      </BottomSheetWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  waypointCard: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  waypointLabel: { fontFamily: fonts.mono500, fontSize: 10, color: colors.ink3, letterSpacing: 0.5 },
  waypointName: { fontFamily: fonts.sans600, fontSize: 14, color: colors.ink0, marginTop: 2 },
  waypointMeta: { alignItems: 'flex-end' },
  waypointDist: { fontFamily: fonts.sans600, fontSize: 18, color: colors.ink0 },
  waypointEta: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink3 },
  speedBadge: {
    position: 'absolute', left: 16,
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.white, borderWidth: 3, borderColor: colors.ink0,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  speedValue: { fontFamily: fonts.mono500, fontSize: 22, color: colors.ink0 },
  speedUnit: { fontFamily: fonts.mono500, fontSize: 9, color: colors.ink3, letterSpacing: 0.5 },
  statusStack: { position: 'absolute', right: 16, gap: 8 },
  statusDot: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  journeyId: { fontFamily: fonts.mono400, fontSize: 10, color: colors.ink3, letterSpacing: 0.5 },
  routeTitle: { fontFamily: fonts.sans600, fontSize: 16, color: colors.ink0, marginTop: 2 },
  statGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: colors.bg3, borderRadius: 10, padding: 10, alignItems: 'center' },
  statLabel: { fontFamily: fonts.mono500, fontSize: 9, color: colors.ink3, letterSpacing: 0.5 },
  statValue: { fontFamily: fonts.mono500, fontSize: 16, color: colors.ink0, marginTop: 4 },
  sheetActions: { flexDirection: 'row', gap: 8 },
  sosButton: {
    width: 52, height: 52, borderRadius: 10,
    backgroundColor: colors.sos, alignItems: 'center', justifyContent: 'center',
  },
  sosText: { fontFamily: fonts.sans600, fontSize: 14, color: colors.white },
});
