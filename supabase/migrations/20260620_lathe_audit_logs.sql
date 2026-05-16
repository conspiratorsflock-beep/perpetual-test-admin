-- ============================================================
-- Phase 5: Lathe Audit Logs
-- App-level audit trail distinct from admin_audit_logs
-- ============================================================

CREATE TABLE IF NOT EXISTS lathe_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  performed_by TEXT NOT NULL,
  performed_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lathe_audit_entity ON lathe_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_lathe_audit_action ON lathe_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_lathe_audit_created ON lathe_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lathe_audit_performed_by ON lathe_audit_logs(performed_by);
