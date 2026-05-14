import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Glyph } from '../ui/glyph';
import { Card } from '../ui/card';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

interface CheckItem {
  id: string;
  label: string;
  description: string;
  status: 'done' | 'pending' | 'locked';
}

interface DepartChecklistProps {
  items: CheckItem[];
  onPress: (id: string) => void;
}

export function DepartChecklist({ items, onPress }: DepartChecklistProps) {
  return (
    <Card noPadding>
      <Text style={styles.header}>BEFORE YOU DEPART</Text>
      {items.map((item, i) => (
        <Pressable
          key={item.id}
          style={[styles.row, i < items.length - 1 && styles.rowBorder]}
          onPress={() => onPress(item.id)}
          disabled={item.status === 'locked'}
        >
          <View style={[styles.checkbox, item.status === 'done' && styles.checkboxDone]}>
            {item.status === 'done' && <Glyph k="check" size={12} color={colors.white} />}
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.label, item.status === 'done' && styles.labelDone]}>{item.label}</Text>
            <Text style={styles.desc}>{item.description}</Text>
          </View>
          {item.status === 'pending' && <Glyph k="chevR" size={16} color={colors.ink4} />}
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { fontFamily: fonts.mono500, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.ink3, padding: 14, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: colors.go, borderColor: colors.go },
  textCol: { flex: 1, gap: 1 },
  label: { fontFamily: fonts.sans500, fontSize: 13, color: colors.ink0 },
  labelDone: { color: colors.ink3, textDecorationLine: 'line-through' },
  desc: { fontFamily: fonts.sans400, fontSize: 11, color: colors.ink4 },
});
