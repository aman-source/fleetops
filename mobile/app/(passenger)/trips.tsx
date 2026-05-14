import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pill } from '../../src/components/ui/pill';
import { Glyph } from '../../src/components/ui/glyph';
import { colors } from '../../src/theme/colors';
import { fonts, type as typ } from '../../src/theme/typography';
import { spacing } from '../../src/theme/tokens';

const TRIPS = [
  { id: '1', pickup: 'Muscat HQ', drop: 'Marmul Camp', date: '14 May', time: '06:00', status: 'active', driver: 'Daoud A.', plate: '34-D-1129', eta: '4 min' },
  { id: '2', pickup: 'Marmul Camp', drop: 'Muscat HQ', date: '13 May', time: '14:00', status: 'completed', driver: 'Salem K.', plate: '12-A-3471', eta: null },
  { id: '3', pickup: 'Muscat HQ', drop: 'Nimr-2', date: '12 May', time: '06:00', status: 'completed', driver: 'Daoud A.', plate: '34-D-1129', eta: null },
  { id: '4', pickup: 'Nimr-2', drop: 'Muscat HQ', date: '11 May', time: '14:30', status: 'completed', driver: 'Hassan M.', plate: '45-B-2290', eta: null },
  { id: '5', pickup: 'Muscat HQ', drop: 'Fahud', date: '10 May', time: '05:30', status: 'rejected', driver: null, plate: null, eta: null },
];

export default function PaxTripsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <View style={styles.hdr}>
        <Text style={styles.sub}>PASSENGER · TRIP LOG</Text>
        <Text style={styles.title}>My trips</Text>
      </View>

      {TRIPS.map((t) => (
        <Pressable key={t.id} style={styles.card} onPress={() => t.status === 'active' ? router.push('/(passenger)/my-trip') : null}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.route}>{t.pickup} → {t.drop}</Text>
              {t.driver && <Text style={styles.driverText}>{t.driver} · {t.plate}</Text>}
            </View>
            <Pill status={t.status} />
          </View>
          <View style={styles.cardBot}>
            <Glyph k="flag" size={14} color={colors.ink4} />
            <Text style={styles.date}>{t.date} · {t.time}</Text>
            <View style={{ flex: 1 }} />
            {t.eta && <Text style={styles.eta}>{t.eta} away</Text>}
            {t.status === 'active' && <Glyph k="chevR" size={14} color={colors.ink0} />}
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0 },
  content: { padding: spacing.screenH, gap: spacing.sectionGap, paddingBottom: 100 },
  hdr: { gap: 4 },
  sub: { fontFamily: fonts.mono500, fontSize: 11, color: colors.ink3, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { ...typ.title, color: colors.ink0 },
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14, gap: 8 },
  route: { fontFamily: fonts.sans600, fontSize: 14, color: colors.ink0 },
  driverText: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink3 },
  cardBot: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.bg3, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  date: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink3 },
  eta: { fontFamily: fonts.mono500, fontSize: 11, color: colors.go },
});
