import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Pill } from '../ui/pill';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

interface TripCalloutProps {
  origin: string;
  destination: string;
  journeyNo: string;
  passengerCount: number;
  distanceKm: number;
  departTime: string;
  eta: string;
  riskLevel: string;
  status: string;
}

export function TripCallout(props: TripCalloutProps) {
  const riskColor = props.riskLevel === 'H' ? colors.nogo : props.riskLevel === 'M' ? colors.cond : colors.go;
  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      <View style={styles.header}>
        <Text style={styles.label}>NEXT TRIP · {props.status.toUpperCase()}</Text>
        <Pill status={props.status} />
      </View>
      <Text style={styles.route}>{props.origin} → {props.destination}</Text>
      <Text style={styles.meta}>{props.journeyNo} · {props.passengerCount} pax · {props.distanceKm} km</Text>
      <View style={styles.strip}>
        <View style={styles.stripItem}>
          <Text style={styles.stripLabel}>DEPART</Text>
          <Text style={styles.stripValue}>{props.departTime}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stripItem}>
          <Text style={styles.stripLabel}>ETA</Text>
          <Text style={styles.stripValue}>{props.eta}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stripItem}>
          <Text style={styles.stripLabel}>RISK</Text>
          <Text style={[styles.stripValue, { color: riskColor }]}>{props.riskLevel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#0f141b', borderRadius: 14, padding: 14, gap: 6, overflow: 'hidden' },
  glow: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(74,144,255,0.25)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontFamily: fonts.mono500, fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8, textTransform: 'uppercase' },
  route: { fontFamily: fonts.sans600, fontSize: 18, color: '#fff' },
  meta: { fontFamily: fonts.mono400, fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  strip: { flexDirection: 'row', marginTop: 8, gap: 0 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.1)' },
  stripItem: { flex: 1, alignItems: 'center' },
  stripLabel: { fontFamily: fonts.mono500, fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' },
  stripValue: { fontFamily: fonts.mono500, fontSize: 22, color: '#fff', marginTop: 2 },
});
