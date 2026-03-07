-- Admin Console Tables Migration
-- Run this in Supabase SQL Editor to set up admin console infrastructure

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Admin Audit Logs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL, -- Clerk user ID
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL, -- e.g., "user.update", "org.tier_change", "flag.toggle"
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'organization', 'project', 'feature_flag', 'system', 'billing', 'announcement')),
  target_id TEXT, -- Optional: ID of the affected entity
  target_name TEXT, -- Optional: human-readable name for display
  metadata JSONB DEFAULT '{}', -- Additional context
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- Enable RLS but allow service role full access
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can access (admin console uses service role)
CREATE POLICY "Service role full access" ON admin_audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Feature Flags
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, -- Machine-readable key (e.g., "new_dashboard")
  name TEXT NOT NULL, -- Human-readable name
  description TEXT,
  enabled_globally BOOLEAN DEFAULT FALSE,
  enabled_for_orgs TEXT[] DEFAULT '{}', -- Array of Clerk org IDs
  enabled_for_users TEXT[] DEFAULT '{}', -- Array of Clerk user IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled_globally);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON feature_flags
  FOR ALL USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Impersonation Tokens
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS impersonation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL, -- SHA-256 hash of the token
  admin_id TEXT NOT NULL, -- Clerk user ID of admin
  admin_email TEXT NOT NULL,
  target_user_id TEXT NOT NULL, -- Clerk user ID being impersonated
  target_user_email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_hash ON impersonation_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_admin ON impersonation_tokens(admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_target ON impersonation_tokens(target_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_tokens_expires ON impersonation_tokens(expires_at);

-- Enable RLS
ALTER TABLE impersonation_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON impersonation_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Admin Announcements
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'critical', 'maintenance')),
  target_tiers TEXT[] DEFAULT '{}', -- Empty = all tiers; e.g., ['free', 'pro']
  target_orgs TEXT[] DEFAULT '{}', -- Empty = all orgs
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL, -- Clerk user ID
  created_by_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_active ON admin_announcements(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON admin_announcements(type);

-- Enable RLS
ALTER TABLE admin_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON admin_announcements
  FOR ALL USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. System Health Checks
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL, -- e.g., "supabase", "stripe", "clerk"
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  latency_ms INTEGER,
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_health_checks_service ON system_health_checks(service_name);
CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON system_health_checks(checked_at DESC);

-- Enable RLS
ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON system_health_checks
  FOR ALL USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Error Logs Aggregation
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL, -- e.g., "api_error", "db_error", "auth_error"
  message TEXT NOT NULL,
  stack_trace TEXT,
  user_id TEXT,
  org_id TEXT,
  path TEXT, -- API endpoint or page path
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON admin_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON admin_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON admin_error_logs(user_id);

-- Enable RLS
ALTER TABLE admin_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON admin_error_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- Functions
-- ─────────────────────────────────────────────────────────────────────────────

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON admin_announcements;
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON admin_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper function to check if a feature flag is enabled for a user/org
-- ─────────────────────────────────────────────────────────────────────────────

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
  
  -- Check global enable
  IF flag_record.enabled_globally THEN
    RETURN TRUE;
  END IF;
  
  -- Check user-specific enable
  IF user_id IS NOT NULL AND user_id = ANY(flag_record.enabled_for_users) THEN
    RETURN TRUE;
  END IF;
  
  -- Check org-specific enable
  IF org_id IS NOT NULL AND org_id = ANY(flag_record.enabled_for_orgs) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed Data
-- ─────────────────────────────────────────────────────────────────────────────

-- Insert default feature flags
INSERT INTO feature_flags (key, name, description, enabled_globally)
VALUES 
  ('new_dashboard', 'New Dashboard UI', 'Beta version of the new dashboard interface', FALSE),
  ('api_v2', 'API Version 2', 'Access to the new v2 API endpoints', FALSE),
  ('advanced_analytics', 'Advanced Analytics', 'Enhanced analytics and reporting features', FALSE),
  ('team_collaboration', 'Team Collaboration', 'Multi-user editing and commenting', FALSE)
ON CONFLICT (key) DO NOTHING;
