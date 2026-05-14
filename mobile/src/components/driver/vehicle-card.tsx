import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/card';
import { Pill } from '../ui/pill';
import { Glyph } from '../ui/glyph';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

interface VehicleCardProps {
  plate: string;
  model: string;
  year: number;
  odometer: number;
  location: string;
  maintStatus: string;
  docsStatus: string;
  ivmsStatus: string;
  rasExpiry: string;
}

export function VehicleCard(props: VehicleCardProps) {
  return (
    <Card>
      <View style={styles.top}>
        <View style={styles.iconBox}>
          <Glyph k="truck" size={24} color={colors.ink2} />
        </View>
        <View style={styles.info}>
          <Text style={styles.plate}>{props.plate}</Text>
          <Text style={styles.location}>{props.location}</Text>
          <Text style={styles.model}>{props.model} · {props.year} · {(props.odometer / 1000).toFixed(0)}k km</Text>
        </View>
      </View>
      <View style={styles.pills}>
        <Pill status={props.maintStatus} label={`MAINT ${props.maintStatus.toUpperCase()}`} />
        <Pill status={props.docsStatus} label="DOCS" />
        <Pill status={props.ivmsStatus} label="IVMS" />
        <Pill status="cond" label={`RAS ${props.rasExpiry}`} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  iconBox: { width: 52, height: 52, borderRadius: 10, backgroundColor: colors.bg3, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  plate: { fontFamily: fonts.mono500, fontSize: 15, color: colors.ink0 },
  location: { fontFamily: fonts.sans400, fontSize: 12, color: colors.ink3 },
  model: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink4 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
