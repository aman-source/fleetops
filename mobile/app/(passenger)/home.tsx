import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { api, unwrap } from '../../src/lib/api';
import { Card } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { Glyph } from '../../src/components/ui/glyph';
import { Pill } from '../../src/components/ui/pill';
import { colors } from '../../src/theme/colors';
import { fonts, type as typ } from '../../src/theme/typography';
import { spacing, radii } from '../../src/theme/tokens';

const TRIP_TYPES = ['One-way', 'Round trip', 'Recurring'] as const;
const TIME_SLOTS = ['05:30', '06:00', '06:30', '07:00'];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [tripType, setTripType] = useState(0);
  const [selectedTime, setSelectedTime] = useState(1);
  const [pickup] = useState({ name: 'Muscat HQ · Building 4 lobby', sub: 'Al Khuwair · Way 4302' });
  const [dropoff] = useState({ name: 'Marmul Camp · Block C', sub: 'PDO Block 6 · approved sites' });
  const [notes, setNotes] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/passenger/requests', {
        pickupName: pickup.name,
        dropName: dropoff.name,
        requestedTime: new Date().toISOString(),
        tripType: ['one_way', 'round_trip', 'recurring'][tripType],
        notes,
      });
      return unwrap(res);
    },
  });

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.dateLabel}>{dateStr.toUpperCase()} · {TIME_SLOTS[selectedTime]} LATER</Text>
          <Text style={styles.title}>Request a trip</Text>
        </View>
        <View style={styles.avatar}>
          <Glyph k="user" size={18} color={colors.white} />
        </View>
      </View>

      <View style={styles.segmented}>
        {TRIP_TYPES.map((t, i) => (
          <Pressable key={t} style={[styles.segBtn, i === tripType && styles.segBtnActive]} onPress={() => setTripType(i)}>
            <Text style={[styles.segText, i === tripType && styles.segTextActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Card noPadding>
        <View style={styles.locRow}>
          <View style={[styles.dot, { backgroundColor: colors.go }]} />
          <View style={styles.locText}>
            <Text style={styles.locLabel}>PICKUP</Text>
            <Text style={styles.locName}>{pickup.name}</Text>
            <Text style={styles.locSub}>{pickup.sub}</Text>
          </View>
        </View>
        <View style={styles.locDivider} />
        <View style={styles.locRow}>
          <View style={styles.dashLine}>
            <View style={styles.dashDot} />
            <View style={styles.dashDot} />
            <View style={styles.dashDot} />
          </View>
          <View style={styles.locText}>
            <Text style={styles.locLabel}>DROP-OFF</Text>
            <Text style={styles.locName}>{dropoff.name}</Text>
            <Text style={styles.locSub}>{dropoff.sub}</Text>
          </View>
        </View>
        <View style={styles.routeInfo}>
          <Glyph k="route" size={14} color={colors.ink3} />
          <Text style={styles.routeText}>712 km · ~8h · pooled shuttle eligible</Text>
          <Glyph k="chevR" size={14} color={colors.ink4} />
        </View>
      </Card>

      <Card>
        <View style={styles.whenHeader}>
          <Text style={styles.locLabel}>WHEN</Text>
          <Pill status="cond" label="SHIFT WINDOW" />
        </View>
        <Text style={styles.whenDate}>{dateStr} · {TIME_SLOTS[selectedTime]}</Text>
        <Text style={styles.whenHelper}>Within day-shift pickup window (05:30–07:00)</Text>
        <View style={styles.timeSlots}>
          {TIME_SLOTS.map((t, i) => (
            <Pressable key={t} style={[styles.timeBtn, i === selectedTime && styles.timeBtnActive]} onPress={() => setSelectedTime(i)}>
              <Text style={[styles.timeText, i === selectedTime && styles.timeTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <View style={styles.eligBanner}>
        <Glyph k="check" size={16} color="#056b48" />
        <View style={{ flex: 1 }}>
          <Text style={styles.eligTitle}>You're eligible for this route</Text>
          <Text style={styles.eligSub}>PDO clearance valid · roster active · day-shift OK</Text>
        </View>
      </View>

      <Card>
        <View style={styles.poolHeader}>
          <View>
            <Text style={styles.locLabel}>POOLABLE WITH</Text>
            <Text style={styles.poolSub}>3 nearby requests · same shift</Text>
          </View>
          <Pill status="active" label="SAVE 18 min" />
        </View>
        {[
          { name: 'H. Al-Lawati', time: '06:00', dest: 'Marmul Block C', color: '#4a90ff' },
          { name: 'F. Al-Amri', time: '05:45', dest: 'Marmul Block A', color: '#a78bfa' },
          { name: 'T. Al-Hosni', time: '06:15', dest: 'Marmul Workshop', color: '#f5a524' },
        ].map((p, i) => (
          <View key={i} style={[styles.poolRow, i < 2 && styles.poolRowBorder]}>
            <View style={[styles.poolAvatar, { backgroundColor: p.color }]}>
              <Text style={styles.poolInitial}>{p.name.split('.').map(s => s.trim()[0]).join('')}</Text>
            </View>
            <View style={styles.poolTextCol}>
              <Text style={styles.poolNameText}>{p.name}</Text>
              <Text style={styles.poolMeta}>{p.time} · {p.dest}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.locLabel}>NOTES TO PLANNER · OPTIONAL</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="e.g. luggage, equipment, mobility needs..."
          placeholderTextColor={colors.ink4}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </Card>

      <Button
        title={submitMutation.isPending ? 'Submitting...' : 'Submit request'}
        onPress={() => submitMutation.mutate()}
        disabled={submitMutation.isPending}
        icon={<Glyph k="chevR" size={16} color={colors.white} />}
      />
      <Text style={styles.slaText}>GOES TO MUSCAT LOGISTICS PLANNER · SLA 30 min</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0 },
  content: { padding: spacing.screenH, gap: spacing.sectionGap, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateLabel: { fontFamily: fonts.mono500, fontSize: 10, color: colors.ink3, letterSpacing: 0.5 },
  title: { ...typ.title, color: colors.ink0 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', gap: 6 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: radii.sm, backgroundColor: colors.bg3, alignItems: 'center' },
  segBtnActive: { backgroundColor: colors.ink0 },
  segText: { fontFamily: fonts.sans500, fontSize: 13, color: colors.ink2 },
  segTextActive: { color: colors.white },
  locRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  locDivider: { height: 1, backgroundColor: colors.lineSoft, marginHorizontal: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, borderWidth: 2, borderColor: colors.white },
  dashLine: { alignItems: 'center', gap: 3, marginTop: 6 },
  dashDot: { width: 2, height: 3, backgroundColor: colors.ink4 },
  locText: { flex: 1, gap: 2 },
  locLabel: { fontFamily: fonts.mono500, fontSize: 10, color: colors.ink3, letterSpacing: 0.8, textTransform: 'uppercase' },
  locName: { fontFamily: fonts.sans500, fontSize: 14, color: colors.ink0 },
  locSub: { fontFamily: fonts.sans400, fontSize: 11, color: colors.ink4 },
  routeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: colors.bg3, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  routeText: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink2, flex: 1 },
  whenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  whenDate: { fontFamily: fonts.mono500, fontSize: 18, color: colors.ink0 },
  whenHelper: { fontFamily: fonts.sans400, fontSize: 11, color: colors.ink4, marginTop: 2 },
  timeSlots: { flexDirection: 'row', gap: 6, marginTop: 12 },
  timeBtn: { flex: 1, paddingVertical: 8, borderRadius: radii.sm, backgroundColor: colors.bg3, alignItems: 'center' },
  timeBtnActive: { backgroundColor: colors.ink0 },
  timeText: { fontFamily: fonts.mono500, fontSize: 13, color: colors.ink2 },
  timeTextActive: { color: colors.white },
  eligBanner: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 10, backgroundColor: 'rgba(122,160,91,0.12)' },
  eligTitle: { fontFamily: fonts.sans600, fontSize: 12.5, color: '#056b48' },
  eligSub: { fontFamily: fonts.sans400, fontSize: 11, color: '#0a5c3a', marginTop: 1 },
  poolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  poolSub: { fontFamily: fonts.sans400, fontSize: 11, color: colors.ink3, marginTop: 1 },
  poolRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  poolRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  poolAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center' as const, justifyContent: 'center' as const },
  poolInitial: { fontFamily: fonts.mono500, fontSize: 10, color: colors.white },
  poolTextCol: { flex: 1, gap: 0 },
  poolNameText: { fontFamily: fonts.sans400, fontSize: 12.5, color: colors.ink0 },
  poolMeta: { fontFamily: fonts.mono400, fontSize: 10.5, color: colors.ink3 },
  notesInput: { fontFamily: fonts.sans400, fontSize: 13, color: colors.ink0, marginTop: 8, minHeight: 60, textAlignVertical: 'top' },
  slaText: { fontFamily: fonts.mono500, fontSize: 10, color: colors.ink3, textAlign: 'center', letterSpacing: 0.5 },
});
