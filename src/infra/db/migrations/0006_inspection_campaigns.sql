-- Migration: inspection_campaigns, inspection_assignments, inspection_items, inspection_responses

CREATE TABLE IF NOT EXISTS inspection_campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  campaign_type    TEXT NOT NULL CHECK (campaign_type IN ('routine','focused','incident_response','compliance')),
  description      TEXT,
  vehicle_scope    JSONB NOT NULL DEFAULT '{}',
  start_date       TIMESTAMPTZ NOT NULL,
  end_date         TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','active','completed','cancelled')),
  created_by       UUID NOT NULL REFERENCES users(id),
  created_by_role  TEXT,
  org_id           UUID NOT NULL REFERENCES organizations(id),
  findings_summary JSONB,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspection_campaigns_org_status ON inspection_campaigns (org_id, status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS inspection_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID NOT NULL REFERENCES inspection_campaigns(id),
  vehicle_id       UUID NOT NULL REFERENCES vehicles(id),
  assigned_to      UUID REFERENCES users(id),
  due_date         TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','passed','failed','skipped')),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  result           JSONB,
  photo_count      INTEGER NOT NULL DEFAULT 0,
  critical_defects INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_inspection_assignments_campaign ON inspection_assignments (campaign_id);
CREATE INDEX IF NOT EXISTS idx_inspection_assignments_vehicle ON inspection_assignments (vehicle_id, status);

CREATE TABLE IF NOT EXISTS inspection_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID NOT NULL REFERENCES inspection_campaigns(id),
  label        TEXT NOT NULL,
  description  TEXT,
  is_critical  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_inspection_items_campaign ON inspection_items (campaign_id);

CREATE TABLE IF NOT EXISTS inspection_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES inspection_assignments(id),
  item_id       UUID NOT NULL REFERENCES inspection_items(id),
  status        TEXT NOT NULL CHECK (status IN ('pass','fail','na')),
  note          TEXT,
  photo_url     TEXT
);

CREATE INDEX IF NOT EXISTS idx_inspection_responses_assignment ON inspection_responses (assignment_id);
