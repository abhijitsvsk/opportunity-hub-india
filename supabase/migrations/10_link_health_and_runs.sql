-- Migration 10: Granular Link Health Tracking, Safety Overrides, and Run Telemetry
-- Strictly separates Link Health from Opportunity Lifecycle.

-- 1. Add health tracking columns with CHECK constraint
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS link_health_status TEXT DEFAULT 'HEALTHY',
ADD COLUMN IF NOT EXISTS consecutive_failures INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS audit_failure_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_http_status INT,
ADD COLUMN IF NOT EXISTS last_health_reason TEXT,
ADD COLUMN IF NOT EXISTS last_final_url TEXT,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reaper_protected BOOLEAN DEFAULT FALSE;

-- Ensure constraint exists without throwing if already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'opportunities_link_health_status_check'
  ) THEN
    ALTER TABLE opportunities
    ADD CONSTRAINT opportunities_link_health_status_check
    CHECK (
      link_health_status IN (
        'HEALTHY',
        'DEAD',
        'CLOSED',
        'BLOCKED',
        'ACCESS_RESTRICTED',
        'TEMP_ERROR',
        'SUSPECT',
        'SOFT_DEAD'
      )
    );
  END IF;
END $$;

-- 2. Fast scan index for un-quarantined/active opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_reaper_scan 
ON opportunities (is_active, reaper_protected, last_checked_at);

-- 3. Telemetry run tracking table to monitor link health changes across runs
CREATE TABLE IF NOT EXISTS reaper_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  mode TEXT NOT NULL DEFAULT 'AUDIT', -- 'AUDIT' or 'LIVE'
  total_checked INT DEFAULT 0,
  healthy_count INT DEFAULT 0,
  dead_count INT DEFAULT 0,
  closed_count INT DEFAULT 0,
  blocked_count INT DEFAULT 0,
  access_restricted_count INT DEFAULT 0,
  temp_error_count INT DEFAULT 0,
  suspect_count INT DEFAULT 0,
  soft_dead_count INT DEFAULT 0,
  domains_degraded JSONB DEFAULT '[]'::jsonb,
  git_sha TEXT,
  summary_markdown TEXT
);
