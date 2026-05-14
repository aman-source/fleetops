import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Glyph } from '../ui/glyph';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

interface ChecklistItemProps {
  label: string;
  description: string;
  status: 'pass' | 'fail' | 'pending';
  onPass: () => void;
  onFail: () => void;
}

export function ChecklistItem({ label, description, status, onPass, onFail }: ChecklistItemProps) {
  return (
    <View style={[styles.row, status === 'fail' && styles.rowFail]}>
      <Pressable
        style={[styles.checkbox,
          status === 'pass' && styles.pass,
          status === 'fail' && styles.fail,
        ]}
        onPress={status === 'pass' ? onFail : onPass}
      >
        {status === 'pass' && <Glyph k="check" size={12} color={colors.white} />}
        {status === 'fail' && <Glyph k="x" size={12} color={colors.white} />}
      </Pressable>
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.desc}>{description}</Text>
      </View>
      {status === 'pending' && <Glyph k="chevR" size={14} color={colors.ink4} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, gap: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.line },
  rowFail: { borderColor: 'rgba(220,38,38,0.4)' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  pass: { backgroundColor: colors.go, borderColor: colors.go },
  fail: { backgroundColor: colors.nogo, borderColor: colors.nogo },
  textCol: { flex: 1, gap: 1 },
  label: { fontFamily: fonts.sans500, fontSize: 13, color: colors.ink0 },
  desc: { fontFamily: fonts.sans400, fontSize: 11, color: colors.ink4 },
});
