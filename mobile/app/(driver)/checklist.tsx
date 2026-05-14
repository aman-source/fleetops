import React, { useEffect } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { useChecklist } from '../../src/stores/checklist';
import { PhotoGrid } from '../../src/components/checklist/photo-grid';
import { ChecklistItem } from '../../src/components/checklist/checklist-item';
import { DefectCard } from '../../src/components/checklist/defect-card';
import { Button } from '../../src/components/ui/button';
import { Glyph } from '../../src/components/ui/glyph';
import { Card } from '../../src/components/ui/card';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/typography';
import { spacing } from '../../src/theme/tokens';
import { enqueue } from '../../src/lib/sync-queue';

const CHECKLIST_ITEMS = [
  { id: '1', label: 'Tires & visible damage', description: 'Check all 4 tires above min' },
  { id: '2', label: 'Oil & coolant levels', description: 'Visual dipstick check' },
  { id: '3', label: 'Lights & signals', description: 'Headlights, tail, indicators' },
  { id: '4', label: 'Windshield & wipers', description: 'No cracks, wipers functional' },
  { id: '5', label: 'Mirrors', description: 'Both side mirrors + rearview' },
  { id: '6', label: 'Horn', description: 'Functional test' },
  { id: '7', label: 'Fire extinguisher', description: 'Present, pressure in green' },
  { id: '8', label: 'First aid kit', description: 'Sealed, in-date' },
  { id: '9', label: 'Seat belts', description: 'All passenger belts functional' },
  { id: '10', label: 'GPS/IVMS device LED', description: 'Steady green = connected' },
  { id: '11', label: 'Fuel level', description: 'Minimum 50% for trip' },
  { id: '12', label: 'Brakes', description: 'Pedal firm, no pull' },
  { id: '13', label: 'Steering', description: 'No excessive play' },
  { id: '14', label: 'Emergency triangle', description: 'Present & accessible' },
  { id: '15', label: 'Spare tire & jack', description: 'Present & serviceable' },
  { id: '16', label: 'AC system', description: 'Cooling functional (desert ops)' },
  { id: '17', label: 'Water supply', description: 'Min 2L per passenger' },
  { id: '18', label: 'Vehicle documents', description: 'Mulkia, RAS, insurance in vehicle' },
];

export default function ChecklistScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { step, items, photos, init, setItemStatus, setPhoto, nextStep, prevStep } = useChecklist();

  useEffect(() => {
    if (items.length === 0) {
      init('current', CHECKLIST_ITEMS.map((i) => ({ ...i, status: 'pending' as const })));
    }
  }, []);

  const completed = items.filter((i) => i.status !== 'pending').length;
  const defects = items.filter((i) => i.status === 'fail');
  const progress = items.length > 0 ? completed / items.length : 0;

  const handleCapture = async (position: string) => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) { Alert.alert('Camera permission required'); return; }
    }
    setPhoto(position as 'front' | 'left' | 'right' | 'rear', `file://placeholder-${position}.jpg`);
  };

  const handleContinue = () => {
    if (step < 5) {
      nextStep();
    } else {
      defects.forEach((d) => {
        enqueue({ endpoint: '/events', method: 'POST', payload: { eventType: 'defect', description: `${d.label}: ${d.note ?? 'Failed inspection'}`, severity: 'medium' } });
      });
      router.push('/(driver)/qr-auth');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()}>
          <Glyph k="chevL" size={20} color={colors.ink0} />
        </Pressable>
        <Text style={styles.stepLabel}>STEP {step + 1} OF 6</Text>
        <Pressable onPress={() => router.back()}>
          <Glyph k="x" size={20} color={colors.ink0} />
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionSub}>PRE-TRIP · VEHICLE EXTERIOR</Text>
        <Text style={styles.sectionTitle}>Walk-around</Text>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{completed} / {items.length} COMPLETE</Text>
          <Text style={styles.defectCount}>{defects.length} DEFECT{defects.length !== 1 ? 'S' : ''}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as unknown as number }]} />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {step === 0 && <PhotoGrid photos={photos} onCapture={handleCapture} />}

        <View style={styles.itemsList}>
          {items.map((item) => (
            <ChecklistItem
              key={item.id}
              label={item.label}
              description={item.description}
              status={item.status}
              onPass={() => setItemStatus(item.id, 'pass')}
              onFail={() => setItemStatus(item.id, 'fail', 'Failed inspection')}
            />
          ))}
        </View>

        {defects.map((d) => (
          <DefectCard key={d.id} itemLabel={d.label} description={d.note ?? 'Failed inspection. Photo uploaded. This may trigger Conditional Release.'} />
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {step > 0 && (
          <View style={{ flex: 1 }}>
            <Button title="Back" variant="secondary" onPress={prevStep} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Button title={step < 5 ? 'Continue' : 'Submit checklist'} onPress={handleContinue} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg0 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.screenH, paddingVertical: 12 },
  stepLabel: { fontFamily: fonts.mono500, fontSize: 12, color: colors.ink2, letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionHeader: { paddingHorizontal: spacing.screenH, paddingBottom: 12 },
  sectionSub: { fontFamily: fonts.mono500, fontSize: 11, color: colors.ink3, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionTitle: { fontFamily: fonts.sans600, fontSize: 22, color: colors.ink0, letterSpacing: -0.4, marginTop: 4 },
  progressSection: { paddingHorizontal: spacing.screenH, gap: 6, marginBottom: 12 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontFamily: fonts.mono400, fontSize: 11, color: colors.ink3 },
  defectCount: { fontFamily: fonts.mono400, fontSize: 11, color: colors.sos },
  progressBar: { height: 4, backgroundColor: colors.bg4, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: colors.ink0, borderRadius: 2 },
  itemsList: { gap: 6 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.screenH, gap: spacing.sectionGap },
  footer: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.screenH, paddingTop: 12, backgroundColor: 'rgba(246,244,238,0.96)', borderTopWidth: 1, borderTopColor: colors.lineSoft },
});
