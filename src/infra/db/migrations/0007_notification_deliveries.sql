-- Migration: notification_deliveries table

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id),
  channel         TEXT NOT NULL,
  provider_id     TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  sent_at         TIMESTAMPTZ,
  error           TEXT
);

CREATE INDEX IF NOT EXISTS idx_notif_deliveries_notif ON notification_deliveries (notification_id);
CREATE INDEX IF NOT EXISTS idx_notif_deliveries_status ON notification_deliveries (status) WHERE status = 'failed';

-- Add mfa_secret and push_token to users table (for P3.6 MFA + push)
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Backup codes table (MFA)
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES users(id),
  code_hash TEXT NOT NULL,
  used_at   TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mfa_codes_user ON mfa_backup_codes (user_id);
