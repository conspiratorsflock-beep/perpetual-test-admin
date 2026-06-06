-- Admin-console-owned tables that were defined in earlier migrations but never
-- applied to the shared DB. All additive (CREATE TABLE IF NOT EXISTS); none conflict
-- with main-app (lathe-studio) tables. Service-role-only access.
--
-- Closes the runtime gap documented in TODO.md ("Schema drift"): logAdminAction()
-- and the system/flags/health/impersonation/seeding features were silently failing
-- because these tables did not exist.
--
-- NOTE: the original definitions used `CREATE POLICY IF NOT EXISTS`, which is not valid
-- Postgres (likely why they never applied) — here we use DROP POLICY IF EXISTS + CREATE.

-- updated_at helper (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── admin_audit_logs ──────────────────────────────────────────
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
CREATE POLICY "Service role full access" ON admin_audit_logs FOR ALL USING (auth.role() = 'service_role');

-- ── admin_error_logs ──────────────────────────────────────────
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
CREATE POLICY "Service role full access" ON admin_error_logs FOR ALL USING (auth.role() = 'service_role');

-- ── feature_flags ─────────────────────────────────────────────
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
CREATE POLICY "Service role full access" ON feature_flags FOR ALL USING (auth.role() = 'service_role');
DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── system_health_checks ──────────────────────────────────────
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
CREATE POLICY "Service role full access" ON system_health_checks FOR ALL USING (auth.role() = 'service_role');

-- ── impersonation_tokens ──────────────────────────────────────
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
CREATE POLICY "Service role full access" ON impersonation_tokens FOR ALL USING (auth.role() = 'service_role');

-- ── system_settings (key→value store; matches 20260314 + admin code) ──
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON system_settings;
CREATE POLICY "Service role full access" ON system_settings FOR ALL USING (auth.role() = 'service_role');
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── support_ticket_seeding_log (seeded_by has no auth.users FK; admin is Clerk-based) ──
CREATE TABLE IF NOT EXISTS support_ticket_seeding_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seeded_by UUID,
  tickets_seeded INTEGER NOT NULL,
  strategy TEXT NOT NULL,
  respect_schedule BOOLEAN DEFAULT false,
  max_per_agent INTEGER,
  categories TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE support_ticket_seeding_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON support_ticket_seeding_log;
CREATE POLICY "Service role full access" ON support_ticket_seeding_log FOR ALL USING (auth.role() = 'service_role');
