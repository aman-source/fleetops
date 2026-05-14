import React from 'react';
import { View, Pressable, Image, Text, StyleSheet } from 'react-native';
import { Glyph } from '../ui/glyph';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

const POSITIONS = ['front', 'left', 'right', 'rear'] as const;
const LABELS: Record<string, string> = { front: 'Front', left: 'L side', right: 'R side', rear: 'Rear' };

interface PhotoGridProps {
  photos: Record<string, string | undefined>;
  onCapture: (position: string) => void;
}

export function PhotoGrid({ photos, onCapture }: PhotoGridProps) {
  return (
    <View style={styles.grid}>
      {POSITIONS.map((pos) => (
        <Pressable key={pos} style={styles.cell} onPress={() => onCapture(pos)}>
          {photos[pos] ? (
            <Image source={{ uri: photos[pos] }} style={styles.image} />
          ) : (
            <View style={styles.empty}>
              <Glyph k="camera" size={20} color={colors.ink4} />
            </View>
          )}
          <Text style={styles.label}>{LABELS[pos]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, alignItems: 'center', gap: 4 },
  image: { width: '100%', aspectRatio: 1, borderRadius: 8 },
  empty: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.mono500, fontSize: 10, color: colors.ink3, letterSpacing: 0.5, textTransform: 'uppercase' },
});
