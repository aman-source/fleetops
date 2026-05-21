import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
const REROUTE_THRESHOLD_M = 200;

export interface NavStep {
  instruction: string;
  maneuverType: string;
  modifier?: string;
  distanceM: number;
  durationS: number;
}

export interface NavState {
  routeCoords: [number, number][];
  steps: NavStep[];
  currentStepIdx: number;
  distanceToNext: number;
  totalDistanceM: number;
  totalDurationS: number;
  userLat: number | null;
  userLon: number | null;
  isRerouting: boolean;
  error: string | null;
}

function distanceBetween(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface DirectionsResult {
  coords: [number, number][];
  steps: NavStep[];
  distance: number;
  duration: number;
}

async function fetchDirections(
  from: { lat: number; lon: number },
  waypoints: Array<{ lat: number; lon: number }>,
): Promise<DirectionsResult | null> {
  if (!MAPBOX_TOKEN) return null;
  const allPts = [from, ...waypoints];
  const coordStr = allPts.map((w) => `${w.lon},${w.lat}`).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordStr}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full&steps=true`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes: Array<{
        geometry: { coordinates: [number, number][] };
        distance: number;
        duration: number;
        legs: Array<{
          steps: Array<{
            maneuver: {
              type: string;
              modifier?: string;
              instruction: string;
            };
            distance: number;
            duration: number;
          }>;
        }>;
      }>;
    };
    const route = data.routes?.[0];
    if (!route) return null;
    const steps: NavStep[] = route.legs.flatMap((l) =>
      l.steps.map((s) => ({
        instruction: s.maneuver.instruction,
        maneuverType: s.maneuver.type,
        modifier: s.maneuver.modifier,
        distanceM: s.distance,
        durationS: s.duration,
      })),
    );
    return {
      coords: route.geometry.coordinates,
      steps,
      distance: route.distance,
      duration: route.duration,
    };
  } catch {
    return null;
  }
}

export function useDirectionsNav(
  waypoints: Array<{ lat: number; lon: number }>,
) {
  const [state, setState] = useState<NavState>({
    routeCoords: [],
    steps: [],
    currentStepIdx: 0,
    distanceToNext: 0,
    totalDistanceM: 0,
    totalDurationS: 0,
    userLat: null,
    userLon: null,
    isRerouting: false,
    error: null,
  });
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const rerouteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function reroute(lat: number, lon: number) {
    setState((prev) => ({ ...prev, isRerouting: true }));
    const result = await fetchDirections({ lat, lon }, waypoints);
    if (result) {
      setState((prev) => ({
        ...prev,
        routeCoords: result.coords,
        steps: result.steps,
        totalDistanceM: result.distance,
        totalDurationS: result.duration,
        currentStepIdx: 0,
        isRerouting: false,
      }));
    } else {
      setState((prev) => ({ ...prev, isRerouting: false }));
    }
  }

  useEffect(() => {
    if (waypoints.length < 1) return;

    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState((prev) => ({ ...prev, error: 'Location permission denied' }));
        return;
      }

      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (cancelled) return;

      const from = {
        lat: initial.coords.latitude,
        lon: initial.coords.longitude,
      };
      setState((prev) => ({ ...prev, userLat: from.lat, userLon: from.lon }));

      const result = await fetchDirections(from, waypoints);
      if (cancelled) return;
      if (result) {
        setState((prev) => ({
          ...prev,
          routeCoords: result.coords,
          steps: result.steps,
          totalDistanceM: result.distance,
          totalDurationS: result.duration,
        }));
      }

      locationSub.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (loc) => {
          if (cancelled) return;
          const { latitude: lat, longitude: lon } = loc.coords;

          setState((prev) => {
            const onRoute = prev.routeCoords.some(
              ([rLon, rLat]) =>
                distanceBetween(lat, lon, rLat, rLon) < REROUTE_THRESHOLD_M,
            );

            if (!onRoute && !prev.isRerouting && prev.routeCoords.length > 0) {
              if (rerouteTimer.current) clearTimeout(rerouteTimer.current);
              rerouteTimer.current = setTimeout(() => reroute(lat, lon), 2000);
              return { ...prev, userLat: lat, userLon: lon };
            }

            // Advance step if close to current step endpoint
            const stepRouteIdx = Math.min(
              prev.currentStepIdx *
                Math.floor(
                  prev.routeCoords.length / Math.max(prev.steps.length, 1),
                ),
              prev.routeCoords.length - 1,
            );
            const stepCoord = prev.routeCoords[stepRouteIdx];
            const distToStep = stepCoord
              ? distanceBetween(lat, lon, stepCoord[1], stepCoord[0])
              : 999;

            const advance =
              distToStep < 30 &&
              prev.currentStepIdx < prev.steps.length - 1;

            return {
              ...prev,
              userLat: lat,
              userLon: lon,
              distanceToNext: distToStep,
              currentStepIdx: advance
                ? prev.currentStepIdx + 1
                : prev.currentStepIdx,
            };
          });
        },
      );
    })();

    return () => {
      cancelled = true;
      locationSub.current?.remove();
      if (rerouteTimer.current) clearTimeout(rerouteTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
