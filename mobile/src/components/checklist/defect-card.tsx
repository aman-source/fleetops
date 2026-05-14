import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Glyph } from '../ui/glyph';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

interface DefectCardProps {
  itemLabel: string;
  description: string;
}

export function DefectCard({ itemLabel, description }: DefectCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Glyph k="alert" size={16} color={colors.nogo} />
        <Text style={styles.title}>Defect logged · {itemLabel}</Text>
      </View>
      <Text style={styles.desc}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.nogoSoft, borderRadius: 10, padding: 12, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.sans600, fontSize: 12, color: colors.nogo },
  desc: { fontFamily: fonts.sans400, fontSize: 11, color: colors.ink2 },
});
