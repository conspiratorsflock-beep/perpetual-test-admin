-- ============================================================
-- Unified Schema Migration: Reconcile admin + lathe-studio schemas
-- Run this AFTER lathe-studio migrations are applied.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. admin_announcements: Add link columns from lathe-studio
-- ─────────────────────────────────────────────────────────────

ALTER TABLE admin_announcements
  ADD COLUMN IF NOT EXISTS link_url TEXT CHECK (link_url IS NULL OR length(link_url) > 0),
  ADD COLUMN IF NOT EXISTS link_text TEXT CHECK (link_text IS NULL OR length(link_text) > 0);

-- Add constraint: both link_url and link_text must be present together or absent together
-- Note: This may fail if existing data violates it; handle manually if needed.
-- ALTER TABLE admin_announcements ADD CONSTRAINT valid_link CHECK (
--   (link_url IS NULL AND link_text IS NULL) OR
--   (link_url IS NOT NULL AND link_text IS NOT NULL)
-- );

-- ─────────────────────────────────────────────────────────────
-- 2. support_tickets: Merge columns from both schemas
-- ─────────────────────────────────────────────────────────────

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reference_code TEXT;

-- Ensure status enum includes all statuses from both schemas
-- (Both already use: open, pending, in_progress, resolved, closed, escalated)

ALTER TABLE support_ticket_comments
  ADD COLUMN IF NOT EXISTS is_agent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_by TEXT,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- 3. support_sla_config: Normalize to minutes + add missing fields
-- ─────────────────────────────────────────────────────────────

-- lathe-studio uses hours; admin uses minutes. Add both and keep them in sync via trigger.
ALTER TABLE support_sla_config
  ADD COLUMN IF NOT EXISTS first_response_time INTEGER,  -- minutes (admin convention)
  ADD COLUMN IF NOT EXISTS resolution_time INTEGER,       -- minutes (admin convention)
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS business_hours_start TIME,
  ADD COLUMN IF NOT EXISTS business_hours_end TIME,
  ADD COLUMN IF NOT EXISTS business_days INTEGER[],
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Migrate hour-based values to minutes if first_response_time is null.
-- The *_hours columns only exist on the legacy shared DB; on a fresh chain
-- (local test stack) they were never created, so guard on their existence.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'support_sla_config' AND column_name = 'first_response_hours') THEN
    UPDATE support_sla_config
    SET first_response_time = first_response_hours * 60
    WHERE first_response_time IS NULL AND first_response_hours IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'support_sla_config' AND column_name = 'resolution_hours') THEN
    UPDATE support_sla_config
    SET resolution_time = resolution_hours * 60
    WHERE resolution_time IS NULL AND resolution_hours IS NOT NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. support_team_members: Merge columns from both schemas
-- ─────────────────────────────────────────────────────────────

ALTER TABLE support_team_members
  ADD COLUMN IF NOT EXISTS skills TEXT[],
  ADD COLUMN IF NOT EXISTS notify_on_new_ticket BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_on_assigned BOOLEAN DEFAULT true;

-- ─────────────────────────────────────────────────────────────
-- 5. Admin-only tables (safe to create if not exists)
-- These don't exist in lathe-studio and need to be added.
-- ─────────────────────────────────────────────────────────────

-- admin_audit_logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'organization', 'project', 'feature_flag', 'system', 'billing', 'announcement', 'support_ticket', 'api_key', 'integration', 'build_queue', 'lead', 'org_setting')),
  target_id TEXT,
  target_name TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at DESC);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON admin_audit_logs;
CREATE POLICY "Service role full access" ON admin_audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- feature_flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  enabled_globally BOOLEAN DEFAULT FALSE,
  enabled_for_orgs TEXT[] DEFAULT '{}',
  enabled_for_users TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled_globally);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON feature_flags;
CREATE POLICY "Service role full access" ON feature_flags
  FOR ALL USING (auth.role() = 'service_role');

-- impersonation_tokens
CREATE TABLE IF NOT EXISTS impersonation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  admin_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  target_user_email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_hash ON impersonation_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_admin ON impersonation_tokens(admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_target ON impersonation_tokens(target_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_expires ON impersonation_tokens(expires_at);

ALTER TABLE impersonation_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON impersonation_tokens;
CREATE POLICY "Service role full access" ON impersonation_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- system_health_checks
CREATE TABLE IF NOT EXISTS system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  latency_ms INTEGER,
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_checks_service ON system_health_checks(service_name);
CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON system_health_checks(checked_at DESC);

ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON system_health_checks;
CREATE POLICY "Service role full access" ON system_health_checks
  FOR ALL USING (auth.role() = 'service_role');

-- admin_error_logs
CREATE TABLE IF NOT EXISTS admin_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  user_id TEXT,
  org_id TEXT,
  path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_type ON admin_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON admin_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON admin_error_logs(user_id);

ALTER TABLE admin_error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON admin_error_logs;
CREATE POLICY "Service role full access" ON admin_error_logs
  FOR ALL USING (auth.role() = 'service_role');

-- api_usage_daily
CREATE TABLE IF NOT EXISTS api_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, endpoint, method)
);

-- 20260312_api_calls_tracking.sql creates api_usage_daily with a different
-- shape (endpoint_breakdown JSONB, no endpoint/date columns), so the CREATE
-- TABLE above no-ops on a fresh chain and these indexes must be guarded.
-- (The feature is dead either way: api_usage_daily was reconciled out of the
-- code in 2026-06 and intentionally never created on the live DB.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'api_usage_daily' AND column_name = 'date') THEN
    CREATE INDEX IF NOT EXISTS idx_api_usage_daily_date ON api_usage_daily(date);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'api_usage_daily' AND column_name = 'endpoint') THEN
    CREATE INDEX IF NOT EXISTS idx_api_usage_daily_endpoint ON api_usage_daily(endpoint);
  END IF;
END $$;

ALTER TABLE api_usage_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON api_usage_daily;
CREATE POLICY "Service role full access" ON api_usage_daily
  FOR ALL USING (auth.role() = 'service_role');

-- system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON system_settings;
CREATE POLICY "Service role full access" ON system_settings
  FOR ALL USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- 6. Functions & Triggers
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to tables that need them
DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON admin_announcements;
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON admin_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_usage_daily_updated_at ON api_usage_daily;
CREATE TRIGGER update_api_usage_daily_updated_at
  BEFORE UPDATE ON api_usage_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- is_feature_enabled helper
CREATE OR REPLACE FUNCTION is_feature_enabled(
  flag_key TEXT,
  user_id TEXT DEFAULT NULL,
  org_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  flag_record RECORD;
BEGIN
  SELECT * INTO flag_record FROM feature_flags WHERE key = flag_key;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  IF flag_record.enabled_globally THEN
    RETURN TRUE;
  END IF;
  
  IF user_id IS NOT NULL AND user_id = ANY(flag_record.enabled_for_users) THEN
    RETURN TRUE;
  END IF;
  
  IF org_id IS NOT NULL AND org_id = ANY(flag_record.enabled_for_orgs) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 7. Seed Data
-- ─────────────────────────────────────────────────────────────

INSERT INTO feature_flags (key, name, description, enabled_globally)
VALUES 
  ('new_dashboard', 'New Dashboard UI', 'Beta version of the new dashboard interface', FALSE),
  ('api_v2', 'API Version 2', 'Access to the new v2 API endpoints', FALSE),
  ('advanced_analytics', 'Advanced Analytics', 'Enhanced analytics and reporting features', FALSE),
  ('team_collaboration', 'Team Collaboration', 'Multi-user editing and commenting', FALSE)
ON CONFLICT (key) DO NOTHING;
