-- ============================================================
-- Phase 4: Operational Tables
-- Integration connections, sandbox leads, build queue items
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. integration_connections
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'not_configured' CHECK (status IN ('active', 'expired', 'error', 'not_configured')),
  connected_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_connections_org_provider ON integration_connections(org_id, provider);
CREATE INDEX IF NOT EXISTS idx_integration_connections_status ON integration_connections(status);
CREATE INDEX IF NOT EXISTS idx_integration_connections_project ON integration_connections(project_id);
CREATE INDEX IF NOT EXISTS idx_integration_connections_updated ON integration_connections(updated_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 2. sandbox_leads
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sandbox_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'organic',
  notes TEXT,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sandbox_leads_email ON sandbox_leads(email);
CREATE INDEX IF NOT EXISTS idx_sandbox_leads_source ON sandbox_leads(source);
CREATE INDEX IF NOT EXISTS idx_sandbox_leads_created ON sandbox_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sandbox_leads_converted ON sandbox_leads(converted_at);

-- ─────────────────────────────────────────────────────────────
-- 3. build_queue_items
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS build_queue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cicd_provider TEXT NOT NULL DEFAULT 'unknown',
  cicd_external_id TEXT,
  assigned_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
  received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  branch TEXT,
  commit_sha TEXT,
  author_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_build_queue_project ON build_queue_items(assigned_project_id);
CREATE INDEX IF NOT EXISTS idx_build_queue_status ON build_queue_items(status);
CREATE INDEX IF NOT EXISTS idx_build_queue_received ON build_queue_items(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_build_queue_provider ON build_queue_items(cicd_provider);

-- ─────────────────────────────────────────────────────────────
-- 4. Auto-update triggers
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_integration_connections_updated_at ON integration_connections;
CREATE TRIGGER update_integration_connections_updated_at
  BEFORE UPDATE ON integration_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_build_queue_items_updated_at ON build_queue_items;
CREATE TRIGGER update_build_queue_items_updated_at
  BEFORE UPDATE ON build_queue_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
