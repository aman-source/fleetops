import React from 'react';
import { StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

interface MapboxViewProps {
  center?: [number, number];
  zoom?: number;
  routeCompleted?: [number, number][];
  routeRemaining?: [number, number][];
  vehiclePosition?: { lat: number; lon: number; heading: number };
  children?: React.ReactNode;
}

export function MapboxView({
  center = [55.78, 18.85],
  zoom = 11,
  routeCompleted,
  routeRemaining,
  vehiclePosition,
  children,
}: MapboxViewProps) {
  return (
    <MapboxGL.MapView
      style={styles.map}
      styleURL={MapboxGL.StyleURL.Light}
      scrollEnabled={false}
      zoomEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      <MapboxGL.Camera centerCoordinate={center} zoomLevel={zoom} />

      {routeCompleted && routeCompleted.length > 1 && (
        <MapboxGL.ShapeSource
          id="routeCompleted"
          shape={{
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: routeCompleted },
            properties: {},
          }}
        >
          <MapboxGL.LineLayer
            id="routeCompletedLine"
            style={{ lineColor: '#1ec991', lineWidth: 4, lineCap: 'round' }}
          />
        </MapboxGL.ShapeSource>
      )}

      {routeRemaining && routeRemaining.length > 1 && (
        <MapboxGL.ShapeSource
          id="routeRemaining"
          shape={{
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: routeRemaining },
            properties: {},
          }}
        >
          <MapboxGL.LineLayer
            id="routeRemainingLine"
            style={{ lineColor: '#15181d', lineWidth: 3, lineOpacity: 0.55 }}
          />
        </MapboxGL.ShapeSource>
      )}

      {vehiclePosition && (
        <MapboxGL.PointAnnotation
          id="vehicle"
          coordinate={[vehiclePosition.lon, vehiclePosition.lat]}
        >
          <MapboxGL.Callout title="" />
        </MapboxGL.PointAnnotation>
      )}

      {children}
    </MapboxGL.MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
