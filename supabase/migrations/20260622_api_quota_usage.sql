-- ============================================================
-- API Quota & Usage Tracking
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. API Keys: quota and usage columns
-- ─────────────────────────────────────────────────────────────

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS monthly_quota_override INTEGER,
  ADD COLUMN IF NOT EXISTS monthly_usage INTEGER DEFAULT 0;

-- ─────────────────────────────────────────────────────────────
-- 2. Organizations: org-level API quota
-- ─────────────────────────────────────────────────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS api_monthly_quota INTEGER;

-- ─────────────────────────────────────────────────────────────
-- 3. Org API usage rollup table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  total_calls INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_org_api_usage_org ON org_api_usage(org_id);
CREATE INDEX IF NOT EXISTS idx_org_api_usage_period ON org_api_usage(year, month);
