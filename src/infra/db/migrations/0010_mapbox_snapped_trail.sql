ALTER TABLE journeys
  ADD COLUMN IF NOT EXISTS snapped_trail jsonb,
  ADD COLUMN IF NOT EXISTS directions_route jsonb;

COMMENT ON COLUMN journeys.snapped_trail IS 'Map-matched GPS trail GeoJSON (post-journey cleanup)';
COMMENT ON COLUMN journeys.directions_route IS 'Mapbox Directions API route GeoJSON geometry';
