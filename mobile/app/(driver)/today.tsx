import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../src/lib/api';
import { useAuth } from '../../src/stores/auth';
import { TripCallout } from '../../src/components/driver/trip-callout';
import { VehicleCard } from '../../src/components/driver/vehicle-card';
import { DepartChecklist } from '../../src/components/driver/depart-checklist';
import { Button } from '../../src/components/ui/button';
import { Glyph } from '../../src/components/ui/glyph';
import { colors } from '../../src/theme/colors';
import { fonts, type as typ } from '../../src/theme/typography';
import { spacing } from '../../src/theme/tokens';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [activating, setActivating] = useState(false);

  const { data: journey } = useQuery({
    queryKey: ['my-journey'],
    queryFn: async () => {
      const res = await api.get('/journeys', { params: { driverId: user?.id, status: 'approved', limit: 1 } });
      const list = unwrap<any[]>(res);
      return list[0] ?? null;
    },
  });

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', journey?.vehicleId],
    queryFn: async () => {
      const res = await api.get(`/vehicles/${journey.vehicleId}`);
      return unwrap<any>(res);
    },
    enabled: !!journey?.vehicleId,
  });

  const firstName = user?.name?.split(' ')[0] ?? 'Driver';
  const today = new Date();
  const dayStr = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  const checkItems = [
    { id: 'checklist', label: 'Complete pre-trip checklist', description: '18 items', status: 'pending' as const },
    { id: 'qr', label: 'Scan QR code at vehicle', description: 'Driver authentication', status: 'locked' as const },
    { id: 'passengers', label: 'Confirm passenger boarding', description: `${journey?.passengerCount ?? 0} manifested`, status: 'locked' as const },
    { id: 'ack', label: 'Acknowledge journey plan', description: 'Route & risk review', status: 'locked' as const },
  ];

  const handleCheckPress = (id: string) => {
    if (id === 'checklist') router.push('/(driver)/checklist');
    if (id === 'qr') router.push('/(driver)/qr-auth');
  };

  const handleStartNav = async () => {
    if (!journey || activating) return;
    setActivating(true);
    try {
      // Activate the journey (status: approved → active)
      await api.post(`/journeys/${journey.id}/activate`);

      // Fetch waypoints for this journey from map-data (now status=active)
      const mapRes = await api.get('/journeys/map-data');
      const mapData = unwrap<Array<{
        id: string;
        waypoints: Array<{ lat: number; lon: number; sequence: number }>;
      }>>(mapRes);
      const jData = mapData.find((j) => j.id === journey.id);
      const sortedWp = (jData?.waypoints ?? [])
        .sort((a, b) => a.sequence - b.sequence);

      const waypointsParam = sortedWp
        .map((w) => `${w.lat},${w.lon}`)
        .join(';');

      router.push(
        `/(driver)/navigation?journeyId=${journey.id}&waypoints=${encodeURIComponent(waypointsParam)}`,
      );
    } catch (err) {
      // Activation failed (gates blocked) — fall through silently; journey remains in current status
      console.warn('Activate failed', err);
    } finally {
      setActivating(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Salaam, {firstName}</Text>
          <Text style={styles.date}>{dayStr} · {dateStr}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{firstName[0]}</Text>
        </View>
      </View>

      {journey ? (
        <TripCallout
          origin={journey.origin ?? 'TBD'}
          destination={journey.destination ?? 'TBD'}
          journeyNo={journey.journeyNo}
          passengerCount={journey.passengerCount ?? 0}
          distanceKm={journey.distanceKm ?? 0}
          departTime={new Date(journey.plannedDeparture).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          eta={new Date(journey.plannedArrival).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          riskLevel={journey.riskLevel ?? 'L'}
          status={journey.status}
        />
      ) : (
        <View style={styles.noTrip}>
          <Text style={styles.noTripText}>No trips assigned today</Text>
        </View>
      )}

      {vehicle && (
        <VehicleCard
          plate={vehicle.plateNumber}
          model={vehicle.model}
          year={vehicle.year}
          odometer={vehicle.odometer}
          location={vehicle.lastKnownLocation ?? 'Unknown'}
          maintStatus={vehicle.status === 'available' ? 'go' : vehicle.status}
          docsStatus="go"
          ivmsStatus="go"
          rasExpiry="18d"
        />
      )}

      <DepartChecklist items={checkItems} onPress={handleCheckPress} />

      {journey && (
        <View style={styles.ctaStack}>
          <Button
            title="Start pre-trip"
            variant="secondary"
            onPress={() => router.push('/(driver)/checklist')}
            icon={<Glyph k="chevR" size={16} color={colors.ink0} />}
          />
          <Button
            title={activating ? 'Activating…' : 'Start navigation'}
            onPress={handleStartNav}
            icon={<Glyph k="chevR" size={16} color={colors.white} />}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0 },
  content: { padding: spacing.screenH, gap: spacing.sectionGap },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  greeting: { ...typ.title, color: colors.ink0 },
  date: { fontFamily: fonts.mono400, fontSize: 12, color: colors.ink3, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.mono500, fontSize: 16, color: colors.white },
  noTrip: { padding: 32, alignItems: 'center' },
  noTripText: { ...typ.body, color: colors.ink3 },
  ctaStack: { gap: 10 },
});
