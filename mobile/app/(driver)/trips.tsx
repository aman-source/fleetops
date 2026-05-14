import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pill } from '../../src/components/ui/pill';
import { Glyph } from '../../src/components/ui/glyph';
import { colors } from '../../src/theme/colors';
import { fonts, type as typ } from '../../src/theme/typography';
import { spacing } from '../../src/theme/tokens';

const TRIPS = [
  { id: '1', no: 'JM-25-04018', from: 'Marmul', to: 'Nimr-2', date: '14 May', time: '14:30', status: 'active', pax: 4, km: 142 },
  { id: '2', no: 'JM-25-04015', from: 'Nimr-2', to: 'Fahud', date: '13 May', time: '06:00', status: 'completed', pax: 6, km: 310 },
  { id: '3', no: 'JM-25-04012', from: 'Fahud', to: 'Marmul', date: '12 May', time: '14:00', status: 'completed', pax: 3, km: 280 },
  { id: '4', no: 'JM-25-04008', from: 'Marmul', to: 'Nimr-2', date: '11 May', time: '06:30', status: 'completed', pax: 5, km: 142 },
  { id: '5', no: 'JM-25-04005', from: 'Nimr-2', to: 'Marmul', date: '10 May', time: '14:00', status: 'completed', pax: 4, km: 142 },
];

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <View style={styles.hdr}>
        <Text style={styles.sub}>DRIVER · TRIP LOG</Text>
        <Text style={styles.title}>Trip history</Text>
      </View>
      <View style={styles.statsRow}>
        {[['THIS WEEK', '3'], ['TOTAL KM', '1,016'], ['AVG PAX', '4.4']].map(([l, v]) => (
          <View key={l} style={styles.stat}>
            <Text style={styles.statL}>{l}</Text>
            <Text style={styles.statV}>{v}</Text>
          </View>
        ))}
      </View>
      {TRIPS.map((t) => (
        <Pressable key={t.id} style={styles.card}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.route}>{t.from} → {t.to}</Text>
              <Text style={styles.meta}>{t.no} · {t.pax} pax · {t.km} km</Text>
            </View>
            <Pill status={t.status} />
          </View>
          <View style={styles.cardBot}>
            <Glyph k="flag" size={14} color={colors.ink4} />
            <Text style={styles.date}>{t.date} · {t.time}</Text>
            <View style={{ flex: 1 }} />
            <Glyph k="chevR" size={14} color={colors.ink4} />
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
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.line, padding: 10, alignItems: 'center' },
  statL: { fontFamily: fonts.mono500, fontSize: 9, color: colors.ink3, letterSpacing: 0.5, textTransform: 'uppercase' },
  statV: { fontFamily: fonts.mono500, fontSize: 18, color: colors.ink0, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14, gap: 8 },
  route: { fontFamily: fonts.sans600, fontSize: 14, color: colors.ink0 },
  meta: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink3 },
  cardBot: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.bg3, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  date: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink3 },
});
