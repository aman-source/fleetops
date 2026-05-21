-- Migration: loading_segments + loading_evidence

CREATE TABLE IF NOT EXISTS loading_segments (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id             UUID NOT NULL REFERENCES journeys(id),
  job_id                 UUID REFERENCES job_plans(id),
  sequence               INTEGER NOT NULL DEFAULT 1,
  material_ref           TEXT,
  material_description   TEXT NOT NULL,
  quantity               NUMERIC(12, 3),
  uom                    TEXT,
  loading_lat            NUMERIC(10, 7),
  loading_lon            NUMERIC(10, 7),
  unloading_lat          NUMERIC(10, 7),
  unloading_lon          NUMERIC(10, 7),
  load_time              TIMESTAMPTZ,
  unload_time            TIMESTAMPTZ,
  loading_clerk_id       UUID REFERENCES users(id),
  supervisor_approved_by UUID REFERENCES users(id),
  status                 TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','loaded','in_transit','unloaded','closed','exception')),
  notes                  TEXT,
  org_id                 UUID NOT NULL REFERENCES organizations(id),
  deleted_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loading_segments_journey ON loading_segments (journey_id);
CREATE INDEX IF NOT EXISTS idx_loading_segments_org_status ON loading_segments (org_id, status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS loading_evidence (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id    UUID NOT NULL REFERENCES loading_segments(id),
  type          TEXT NOT NULL CHECK (type IN ('load_photo','unload_photo','signature','document')),
  file_url      TEXT NOT NULL,
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_by   UUID NOT NULL REFERENCES users(id),
  exif_stripped BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_loading_evidence_segment ON loading_evidence (segment_id);
