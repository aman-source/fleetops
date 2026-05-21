import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapboxGL, { UserTrackingMode } from '@rnmapbox/maps';
import { useDirectionsNav } from '../../src/hooks/useDirectionsNav';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

function parseWaypoints(
  str: string,
): Array<{ lat: number; lon: number }> {
  return str
    .split(';')
    .map((p) => {
      const [lat, lon] = p.split(',').map(Number);
      return { lat, lon };
    })
    .filter((w) => !isNaN(w.lat) && !isNaN(w.lon));
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function formatEta(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const BANNER_HEIGHT = Platform.OS === 'ios' ? 120 : 100;

export default function NavigationScreen() {
  const { waypoints: waypointsParam } = useLocalSearchParams<{
    journeyId: string;
    waypoints: string;
  }>();
  const router = useRouter();
  const waypoints = parseWaypoints(waypointsParam ?? '');
  const nav = useDirectionsNav(waypoints);

  const currentStep = nav.steps[nav.currentStepIdx];
  const isLastStep = nav.currentStepIdx >= nav.steps.length - 1;

  const routeShape = {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: nav.routeCoords,
    },
    properties: {},
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1e25" />

      {/* Maneuver banner */}
      <View style={styles.banner}>
        <View style={styles.bannerLeft}>
          {nav.isRerouting ? (
            <Text style={styles.rerouteText}>Rerouting…</Text>
          ) : nav.error ? (
            <Text style={styles.errorText}>{nav.error}</Text>
          ) : currentStep ? (
            <>
              <Text style={styles.distText}>
                {formatDistance(nav.distanceToNext || currentStep.distanceM)}
              </Text>
              <Text style={styles.instructionText} numberOfLines={2}>
                {currentStep.instruction}
              </Text>
            </>
          ) : (
            <Text style={styles.instructionText}>Starting navigation…</Text>
          )}
        </View>
        <View style={styles.etaBadge}>
          <Text style={styles.etaTime}>{formatEta(nav.totalDurationS)}</Text>
          <Text style={styles.etaDist}>
            {formatDistance(nav.totalDistanceM)}
          </Text>
        </View>
      </View>

      {/* Map */}
      <MapboxGL.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/dark-v11"
        compassEnabled={false}
        scaleBarEnabled={false}
      >
        {nav.userLat != null && nav.userLon != null && (
          <MapboxGL.Camera
            followUserLocation
            followZoomLevel={15}
            followUserMode={UserTrackingMode.Follow}
          />
        )}
        <MapboxGL.UserLocation visible animated />

        {nav.routeCoords.length > 1 && (
          <MapboxGL.ShapeSource id="route-source" shape={routeShape}>
            <MapboxGL.LineLayer
              id="route-line"
              style={{
                lineColor: '#4a90ff',
                lineWidth: 5,
                lineOpacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {waypoints.map((wp, i) => (
          <MapboxGL.MarkerView
            key={i}
            coordinate={[wp.lon, wp.lat]}
          >
            <View
              style={[
                styles.pin,
                i === waypoints.length - 1 ? styles.pinDest : styles.pinWp,
              ]}
            >
              <Text style={styles.pinText}>
                {i === waypoints.length - 1 ? '\u25A0' : String(i + 1)}
              </Text>
            </View>
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.arriveBtn,
            !isLastStep && styles.arriveBtnSecondary,
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.arriveBtnText}>
            {isLastStep
              ? 'Mark Arrived'
              : `${nav.steps.length - nav.currentStepIdx} steps remaining`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1e25' },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: BANNER_HEIGHT,
    backgroundColor: '#1a1e25',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2e35',
  },
  bannerLeft: { flex: 1 },
  distText: { fontSize: 28, fontWeight: '600', color: '#4a90ff' },
  instructionText: { fontSize: 13, color: '#e8e4d8', marginTop: 2 },
  rerouteText: { fontSize: 16, color: '#f5a524' },
  errorText: { fontSize: 13, color: '#ef4747' },
  etaBadge: {
    backgroundColor: '#242830',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    minWidth: 72,
    marginLeft: 12,
  },
  etaTime: { fontSize: 15, fontWeight: '600', color: '#e8e4d8' },
  etaDist: { fontSize: 10, color: '#8a8270', marginTop: 2 },
  map: { flex: 1, marginTop: BANNER_HEIGHT },
  pin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  pinWp: { backgroundColor: '#4a90ff' },
  pinDest: { backgroundColor: '#1ec991' },
  pinText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingTop: 12,
    backgroundColor: '#1a1e25',
    borderTopWidth: 1,
    borderTopColor: '#2a2e35',
  },
  arriveBtn: {
    backgroundColor: '#1ec991',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  arriveBtnSecondary: { backgroundColor: '#242830' },
  arriveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
