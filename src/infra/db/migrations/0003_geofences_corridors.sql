-- Migration: geofences + journey_route_corridors tables
-- Requires PostGIS extension (already enabled by 0000_initial.sql)

-- Geofences
CREATE TABLE IF NOT EXISTS geofences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('red_zone', 'site', 'camp', 'corridor', 'refuel')),
  geom        GEOMETRY(Polygon, 4326) NOT NULL,
  org_id      UUID NOT NULL REFERENCES organizations(id),
  project_id  UUID,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofences_geom ON geofences USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_geofences_org_active ON geofences (org_id) WHERE deleted_at IS NULL AND active = TRUE;

-- Route corridors — generated on journey approval
CREATE TABLE IF NOT EXISTS journey_route_corridors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id    UUID NOT NULL REFERENCES journeys(id),
  corridor      GEOMETRY(Polygon, 4326) NOT NULL,
  buffer_meters INTEGER NOT NULL DEFAULT 500,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journey_corridors_journey ON journey_route_corridors (journey_id);

-- Seed sample geofences with realistic Oman coordinates
-- Only inserts if organizations table has rows
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  IF v_org_id IS NOT NULL THEN
    -- Marmul Restricted Zone (~2km radius, approximate polygon)
    INSERT INTO geofences (name, type, geom, org_id, active)
    VALUES (
      'Marmul Restricted Zone', 'red_zone',
      ST_Buffer(
        ST_SetSRID(ST_MakePoint(55.20, 18.13), 4326)::GEOGRAPHY,
        2000
      )::GEOMETRY,
      v_org_id, TRUE
    ) ON CONFLICT DO NOTHING;

    -- Nimr Site Boundary (~3km radius)
    INSERT INTO geofences (name, type, geom, org_id, active)
    VALUES (
      'Nimr Site Boundary', 'site',
      ST_Buffer(
        ST_SetSRID(ST_MakePoint(55.93, 19.13), 4326)::GEOGRAPHY,
        3000
      )::GEOMETRY,
      v_org_id, TRUE
    ) ON CONFLICT DO NOTHING;

    -- Fahud Camp (~1.5km radius)
    INSERT INTO geofences (name, type, geom, org_id, active)
    VALUES (
      'Fahud Camp Boundary', 'camp',
      ST_Buffer(
        ST_SetSRID(ST_MakePoint(56.50, 22.34), 4326)::GEOGRAPHY,
        1500
      )::GEOMETRY,
      v_org_id, TRUE
    ) ON CONFLICT DO NOTHING;

    -- Marmul Refuel Station (~500m radius)
    INSERT INTO geofences (name, type, geom, org_id, active)
    VALUES (
      'Marmul Refuel Station', 'refuel',
      ST_Buffer(
        ST_SetSRID(ST_MakePoint(55.22, 18.14), 4326)::GEOGRAPHY,
        500
      )::GEOMETRY,
      v_org_id, TRUE
    ) ON CONFLICT DO NOTHING;
  END IF;
END
$$;
