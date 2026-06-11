-- ============================================================
-- Lathe-studio baseline (LOCAL TEST STACKS ONLY)
--
-- The admin-console migration chain is additive on top of the
-- lathe-studio schema; later migrations FK into `organizations`
-- and `projects`, which lathe-studio owns and creates. On the
-- shared dev/prod DB these tables always exist, so every
-- statement here is a guaranteed no-op (CREATE TABLE IF NOT
-- EXISTS). On a fresh local stack (`supabase db reset` for
-- `npm run test:db`) this provides the minimum baseline.
--
-- Column definitions were dumped from the live DB on 2026-06-11.
-- If lathe-studio's schema changes, this file may drift; it is
-- never the source of truth.
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  clerk_org_id TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  lead_count INTEGER NOT NULL DEFAULT 0,
  tester_count INTEGER NOT NULL DEFAULT 0,
  trial_started_at TIMESTAMPTZ DEFAULT now(),
  trial_ends_at TIMESTAMPTZ,
  trial_lock_state TEXT NOT NULL DEFAULT 'active'
    CHECK (trial_lock_state IN ('active', 'soft_locked', 'hard_locked', 'paid')),
  trial_extension_used BOOLEAN DEFAULT false,
  trial_warning_sent_at TIMESTAMPTZ,
  trial_soft_lock_sent_at TIMESTAMPTZ,
  trial_hard_lock_sent_at TIMESTAMPTZ,
  stripe_price_id TEXT,
  api_monthly_quota INTEGER
);

-- Pre-20260622 shape: monthly_quota_override / monthly_usage are added by
-- 20260622_api_quota_usage.sql (ADD COLUMN IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID,
  name VARCHAR NOT NULL,
  key_hash VARCHAR NOT NULL,
  key_prefix VARCHAR NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['builds:read'::text, 'builds:create'::text],
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

-- project_members.custom_role_id / assigned_via_group_id reference tables
-- created later by 20260621_rbac_custom_roles_groups.sql; the live columns
-- carry no FK constraint to them from this table's creation, so plain UUID
-- columns here match live behavior for FK purposes.
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  clerk_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  custom_role_id UUID,
  assigned_via_group_id UUID
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  jira_project_key TEXT,
  jira_site_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  project_code VARCHAR,
  bitbucket_repo_url TEXT,
  requirements_enabled BOOLEAN NOT NULL DEFAULT true,
  weekly_report_enabled BOOLEAN NOT NULL DEFAULT false,
  created_by UUID
);
