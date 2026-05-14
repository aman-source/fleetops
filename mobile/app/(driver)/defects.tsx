import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pill } from '../../src/components/ui/pill';
import { Glyph } from '../../src/components/ui/glyph';
import { colors } from '../../src/theme/colors';
import { fonts, type as typ } from '../../src/theme/typography';
import { spacing } from '../../src/theme/tokens';

const DEFECTS = [
  { id: '1', item: 'Fire extinguisher', vehicle: '12-A-3471', date: '14 May', status: 'pending', sev: 'medium', desc: 'Pressure gauge below green band' },
  { id: '2', item: 'Left mirror cracked', vehicle: '12-A-3471', date: '12 May', status: 'completed', sev: 'low', desc: 'Small crack bottom-left corner. Replaced.' },
  { id: '3', item: 'Tire tread (rear-left)', vehicle: '34-D-1129', date: '10 May', status: 'completed', sev: 'high', desc: 'Below minimum depth. Tire replaced.' },
  { id: '4', item: 'IVMS device offline', vehicle: '12-A-3471', date: '8 May', status: 'completed', sev: 'medium', desc: 'Device restarted. Online now.' },
];

const SEV: Record<string, string> = { high: colors.nogo, medium: colors.cond, low: colors.go };

export default function DefectsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <View style={styles.hdr}>
        <Text style={styles.sub}>DRIVER · DEFECT LOG</Text>
        <Text style={styles.title}>Defects</Text>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statL}>OPEN</Text><Text style={[styles.statV, { color: colors.cond }]}>1</Text></View>
        <View style={styles.stat}><Text style={styles.statL}>RESOLVED</Text><Text style={[styles.statV, { color: colors.go }]}>3</Text></View>
        <View style={styles.stat}><Text style={styles.statL}>THIS MONTH</Text><Text style={styles.statV}>4</Text></View>
      </View>
      {DEFECTS.map((d) => (
        <View key={d.id} style={[styles.card, d.status === 'pending' && styles.cardPending]}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.defHdr}>
                <Glyph k="alert" size={16} color={SEV[d.sev] ?? colors.cond} />
                <Text style={styles.defItem}>{d.item}</Text>
              </View>
              <Text style={styles.defDesc}>{d.desc}</Text>
            </View>
            <Pill status={d.status} />
          </View>
          <View style={styles.defMeta}>
            <Glyph k="truck" size={12} color={colors.ink4} />
            <Text style={styles.defMetaText}>{d.vehicle} · {d.date}</Text>
          </View>
        </View>
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
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 10 },
  cardPending: { borderColor: 'rgba(224,167,56,0.4)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  defHdr: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  defItem: { fontFamily: fonts.sans600, fontSize: 14, color: colors.ink0 },
  defDesc: { fontFamily: fonts.sans400, fontSize: 12, color: colors.ink3 },
  defMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  defMetaText: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink4 },
});
