import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/stores/auth';
import { Button } from '../../src/components/ui/button';
import { Glyph } from '../../src/components/ui/glyph';
import { Pill } from '../../src/components/ui/pill';
import { Card } from '../../src/components/ui/card';
import { colors } from '../../src/theme/colors';
import { fonts, type as typ } from '../../src/theme/typography';
import { spacing } from '../../src/theme/tokens';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const name = user?.name ?? 'Daoud Al-Busaidi';
  const initial = name[0];

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <View style={styles.hdr}>
        <Text style={styles.sub}>DRIVER PROFILE</Text>
        <Text style={styles.title}>Me</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarLg}><Text style={styles.avatarText}>{initial}</Text></View>
        <Text style={styles.profileName}>{name}</Text>
        <Text style={styles.profileRole}>{(user?.role ?? 'driver').toUpperCase()}</Text>
        <Pill status="active" label="ON DUTY" />
      </View>

      <Card>
        <Text style={styles.secLabel}>DETAILS</Text>
        {[
          { i: 'doc', l: 'Employee ID', v: 'AR-DRV-0041' },
          { i: 'doc', l: 'License', v: 'OM-DL-28934 · Class D' },
          { i: 'shield', l: 'DDC Expiry', v: '18 Nov 2026' },
          { i: 'doc', l: 'Medical Expiry', v: '03 Mar 2027' },
          { i: 'truck', l: 'Authorized', v: 'Hilux, Coaster, Bus' },
        ].map((item, i, arr) => (
          <View key={i} style={[styles.detailRow, i < arr.length - 1 && styles.detailBorder]}>
            <Glyph k={item.i} size={16} color={colors.ink4} />
            <View style={styles.detailText}>
              <Text style={styles.detailLabel}>{item.l}</Text>
              <Text style={styles.detailValue}>{item.v}</Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={styles.statsRow}>
        {[['TRIPS', '247'], ['KM DRIVEN', '38.4k'], ['DEFECTS', '12']].map(([l, v]) => (
          <View key={l} style={styles.stat}>
            <Text style={styles.statL}>{l}</Text>
            <Text style={styles.statV}>{v}</Text>
          </View>
        ))}
      </View>

      <Button title="Sign out" variant="ghost" onPress={logout} icon={<Glyph k="chevR" size={16} color={colors.ink0} />} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0 },
  content: { padding: spacing.screenH, gap: spacing.sectionGap, paddingBottom: 100 },
  hdr: { gap: 4 },
  sub: { fontFamily: fonts.mono500, fontSize: 11, color: colors.ink3, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { ...typ.title, color: colors.ink0 },
  profileCard: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  avatarLg: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.mono500, fontSize: 28, color: colors.white },
  profileName: { fontFamily: fonts.sans600, fontSize: 20, color: colors.ink0 },
  profileRole: { fontFamily: fonts.mono500, fontSize: 11, color: colors.ink3, letterSpacing: 0.5 },
  secLabel: { fontFamily: fonts.mono500, fontSize: 10, color: colors.ink3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  detailBorder: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  detailText: { flex: 1, gap: 1 },
  detailLabel: { fontFamily: fonts.sans400, fontSize: 11, color: colors.ink4 },
  detailValue: { fontFamily: fonts.sans500, fontSize: 13, color: colors.ink0 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.line, padding: 10, alignItems: 'center' },
  statL: { fontFamily: fonts.mono500, fontSize: 9, color: colors.ink3, letterSpacing: 0.5, textTransform: 'uppercase' },
  statV: { fontFamily: fonts.mono500, fontSize: 18, color: colors.ink0, marginTop: 4 },
});
