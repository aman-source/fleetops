import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const STATUS_MAP: Record<string, { label: string; klass: string }> = {
  go:        { label: 'GO',          klass: 'go' },
  cond:      { label: 'CONDITIONAL', klass: 'cond' },
  nogo:      { label: 'NO-GO',       klass: 'nogo' },
  active:    { label: 'ACTIVE',      klass: 'info' },
  approved:  { label: 'APPROVED',    klass: 'go' },
  pending:   { label: 'PENDING',     klass: 'cond' },
  rejected:  { label: 'REJECTED',    klass: 'nogo' },
  draft:     { label: 'DRAFT',       klass: 'neutral' },
  completed: { label: 'COMPLETED',   klass: 'go' },
  available: { label: 'AVAILABLE',   klass: 'go' },
  conditional: { label: 'CONDITIONAL', klass: 'cond' },
};

const KLASS_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  go:      { text: colors.go, bg: colors.goSoft, border: 'rgba(122,160,91,0.25)' },
  cond:    { text: colors.cond, bg: colors.condSoft, border: 'rgba(224,167,56,0.25)' },
  nogo:    { text: colors.nogo, bg: colors.nogoSoft, border: 'rgba(192,57,43,0.3)' },
  info:    { text: colors.info, bg: colors.infoSoft, border: 'rgba(217,119,87,0.25)' },
  neutral: { text: colors.ink2, bg: colors.neutralSoft, border: 'rgba(107,118,137,0.25)' },
};

export function Pill({ status, label }: { status: string; label?: string }) {
  const s = STATUS_MAP[status] ?? { label: label ?? status.toUpperCase(), klass: 'neutral' };
  const c = KLASS_COLORS[s.klass] ?? KLASS_COLORS.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: c.bg, borderColor: c.border }]}>
      <View style={[styles.dot, { backgroundColor: c.text }]} />
      <Text style={[styles.text, { color: c.text }]}>{label ?? s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: { width: 5, height: 5, borderRadius: 999 },
  text: { fontFamily: fonts.mono500, fontSize: 11, letterSpacing: 0.1 },
});
