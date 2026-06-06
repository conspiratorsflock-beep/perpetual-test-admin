-- Admin-owned registry of domains available for the app's Test Email feature.
-- The admin app manages this list (add / soft-delete / reactivate); the APP repo's
-- inbound pipeline must READ it to (a) generate addresses only on active domains and
-- (b) accept inbound only for active domains. This table is a registry/allowlist — it
-- does NOT provision DNS/MX or provider inbound routes (that is external infra).
--
-- Soft-delete model: "delete" sets is_active = false (kept on the list, reactivatable)
-- so admins never hard-remove a domain and accidentally interrupt customers.

CREATE TABLE IF NOT EXISTS test_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  deactivated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_test_email_domains_active ON test_email_domains(is_active);

ALTER TABLE test_email_domains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON test_email_domains;
CREATE POLICY "Service role full access" ON test_email_domains FOR ALL USING (auth.role() = 'service_role');

-- reuse the shared updated_at trigger helper (created by 20260605230000)
DROP TRIGGER IF EXISTS update_test_email_domains_updated_at ON test_email_domains;
CREATE TRIGGER update_test_email_domains_updated_at BEFORE UPDATE ON test_email_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
