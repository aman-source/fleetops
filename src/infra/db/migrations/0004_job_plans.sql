-- Migration: job_plans, job_waypoints, job_proofs

CREATE TABLE IF NOT EXISTS job_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number      TEXT UNIQUE NOT NULL,
  journey_id      UUID REFERENCES journeys(id),
  work_order_ref  TEXT,
  job_type        TEXT NOT NULL CHECK (job_type IN ('delivery','pickup','service','inspection','survey','maintenance')),
  purpose         TEXT,
  destination_lat NUMERIC(10, 7),
  destination_lon NUMERIC(10, 7),
  planned_start   TIMESTAMPTZ,
  planned_end     TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','assigned','in_progress','completed','closed','cancelled')),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  created_by      UUID NOT NULL REFERENCES users(id),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_plans_org_status ON job_plans (org_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_plans_journey ON job_plans (journey_id);

CREATE TABLE IF NOT EXISTS job_waypoints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES job_plans(id),
  sequence        INTEGER NOT NULL,
  name            TEXT NOT NULL,
  lat             NUMERIC(10, 7) NOT NULL,
  lon             NUMERIC(10, 7) NOT NULL,
  planned_arrival TIMESTAMPTZ,
  actual_arrival  TIMESTAMPTZ,
  proof_type      TEXT NOT NULL DEFAULT 'none' CHECK (proof_type IN ('signature','photo','nfc_scan','none')),
  proof_data      JSONB,
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_job_waypoints_job ON job_waypoints (job_id, sequence);

CREATE TABLE IF NOT EXISTS job_proofs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES job_plans(id),
  waypoint_id   UUID REFERENCES job_waypoints(id),
  type          TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  captured_by   UUID NOT NULL REFERENCES users(id),
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_lat    NUMERIC(10, 7),
  device_lon    NUMERIC(10, 7)
);

CREATE INDEX IF NOT EXISTS idx_job_proofs_job ON job_proofs (job_id);
