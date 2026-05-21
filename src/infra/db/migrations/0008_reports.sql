-- Reports: on-demand and scheduled PDF reports

CREATE TABLE IF NOT EXISTS reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES organizations(id),
  report_type    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  params         JSONB,
  file_key       TEXT,
  file_size_bytes TEXT,
  error_message  TEXT,
  requested_by   UUID NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES organizations(id),
  report_type          TEXT NOT NULL,
  cron_expression      TEXT NOT NULL,
  params               JSONB,
  recipient_user_ids   JSONB NOT NULL DEFAULT '[]',
  enabled              BOOLEAN NOT NULL DEFAULT true,
  last_run_at          TIMESTAMPTZ,
  next_run_at          TIMESTAMPTZ,
  created_by           UUID NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_org_id      ON reports(org_id);
CREATE INDEX IF NOT EXISTS idx_reports_status      ON reports(status);
CREATE INDEX IF NOT EXISTS idx_sched_reports_org   ON scheduled_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_sched_reports_next  ON scheduled_reports(next_run_at) WHERE enabled = true;
