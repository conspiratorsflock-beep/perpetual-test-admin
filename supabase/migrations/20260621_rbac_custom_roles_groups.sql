-- ============================================================
-- RBAC Phase 2: Custom Roles, User Groups, and Project Access
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Permissions catalog (immutable, ~50 rows)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('page', 'operation', 'data')),
  description TEXT,
  is_restricted BOOLEAN DEFAULT FALSE,
  UNIQUE(resource, action)
);

CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_restricted ON permissions(is_restricted);

-- Seed the canonical permission catalog
INSERT INTO permissions (resource, action, level, description, is_restricted) VALUES
  -- Page level
  ('page', 'projects', 'page', 'Access the projects list page', FALSE),
  ('page', 'project_detail', 'page', 'Access the project detail page', FALSE),
  ('page', 'releases', 'page', 'Access the releases page', FALSE),
  ('page', 'builds', 'page', 'Access the builds page', FALSE),
  ('page', 'test_runs', 'page', 'Access the test runs page', FALSE),
  ('page', 'test_cases', 'page', 'Access the test cases page', FALSE),
  ('page', 'reports', 'page', 'Access the reports page', FALSE),
  ('page', 'project_settings', 'page', 'Access the project settings page', FALSE),
  ('page', 'organization_settings', 'page', 'Access the organization settings page', FALSE),

  -- Project
  ('project', 'create', 'operation', 'Create new projects', FALSE),
  ('project', 'read', 'operation', 'View projects', FALSE),
  ('project', 'update', 'operation', 'Update project details', FALSE),
  ('project', 'delete', 'operation', 'Delete projects', TRUE),

  -- Release
  ('release', 'create', 'operation', 'Create releases', FALSE),
  ('release', 'read', 'operation', 'View releases', FALSE),
  ('release', 'update', 'operation', 'Update releases', FALSE),
  ('release', 'delete', 'operation', 'Delete releases', FALSE),

  -- Build
  ('build', 'create', 'operation', 'Create builds', FALSE),
  ('build', 'read', 'operation', 'View builds', FALSE),
  ('build', 'update', 'operation', 'Update builds', FALSE),
  ('build', 'delete', 'operation', 'Delete builds', FALSE),

  -- Test run
  ('test_run', 'create', 'operation', 'Create test runs', FALSE),
  ('test_run', 'read', 'operation', 'View test runs', FALSE),
  ('test_run', 'update', 'operation', 'Update test runs', FALSE),
  ('test_run', 'delete', 'operation', 'Delete test runs', FALSE),
  ('test_run', 'submit', 'operation', 'Submit test run results', FALSE),

  -- Test case
  ('test_case', 'create', 'operation', 'Create test cases', FALSE),
  ('test_case', 'read', 'operation', 'View test cases', FALSE),
  ('test_case', 'update', 'operation', 'Update test cases', FALSE),
  ('test_case', 'delete', 'operation', 'Delete test cases', FALSE),

  -- Member
  ('member', 'manage', 'operation', 'Manage project members', FALSE),
  ('member', 'transfer_ownership', 'operation', 'Transfer project ownership', TRUE),

  -- Integration
  ('integration', 'manage', 'operation', 'Manage integrations', FALSE),

  -- Organization
  ('organization', 'manage', 'operation', 'Manage organization settings', FALSE),
  ('organization', 'billing', 'operation', 'Access billing features', TRUE),

  -- Section
  ('section', 'manage', 'operation', 'Manage test case sections', FALSE),

  -- Requirement
  ('requirement', 'manage', 'operation', 'Manage requirements', FALSE),

  -- Tag
  ('tag', 'manage', 'operation', 'Manage tags', FALSE),

  -- Jira
  ('jira', 'push', 'operation', 'Push data to Jira', FALSE),

  -- Report
  ('report', 'view', 'operation', 'View reports', FALSE),

  -- API key
  ('api_key', 'manage', 'operation', 'Manage API keys', FALSE),
  ('api_key', 'revoke_any', 'operation', 'Revoke any API key in the org', FALSE),

  -- Data-level / ReBAC
  ('project', 'update_own', 'data', 'Update own projects', FALSE),
  ('project', 'delete_own', 'data', 'Delete own projects', FALSE),
  ('release', 'update_own', 'data', 'Update own releases', FALSE),
  ('release', 'delete_own', 'data', 'Delete own releases', FALSE),
  ('build', 'update_own', 'data', 'Update own builds', FALSE),
  ('build', 'delete_own', 'data', 'Delete own builds', FALSE),
  ('test_run', 'update_own', 'data', 'Update own test runs', FALSE),
  ('test_run', 'delete_own', 'data', 'Delete own test runs', FALSE),
  ('test_case', 'update_own', 'data', 'Update own test cases', FALSE),
  ('test_case', 'delete_own', 'data', 'Delete own test cases', FALSE)
ON CONFLICT (resource, action) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. Custom roles (org-level, including 4 system roles per org)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_role TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  system_role_key TEXT CHECK (system_role_key IN ('viewer', 'tester', 'admin', 'owner')),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, system_role_key)
);

CREATE INDEX IF NOT EXISTS idx_custom_roles_org ON custom_roles(org_id);
CREATE INDEX IF NOT EXISTS idx_custom_roles_system ON custom_roles(is_system);

-- ─────────────────────────────────────────────────────────────
-- 3. Role permissions (many-to-many)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- ─────────────────────────────────────────────────────────────
-- 4. User groups (org-level)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_groups_org ON user_groups(org_id);

-- ─────────────────────────────────────────────────────────────
-- 5. Group memberships
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS group_memberships (
  group_id UUID NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, clerk_user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON group_memberships(clerk_user_id);

-- ─────────────────────────────────────────────────────────────
-- 6. Project group access
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_group_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  assigned_by TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_project_group_access_project ON project_group_access(project_id);
CREATE INDEX IF NOT EXISTS idx_project_group_access_group ON project_group_access(group_id);

-- ─────────────────────────────────────────────────────────────
-- 7. Update project_members for RBAC
-- ─────────────────────────────────────────────────────────────

ALTER TABLE project_members
  ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES custom_roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_via_group_id UUID REFERENCES user_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_members_custom_role ON project_members(custom_role_id);
CREATE INDEX IF NOT EXISTS idx_project_members_assigned_via_group ON project_members(assigned_via_group_id);

-- ─────────────────────────────────────────────────────────────
-- 8. Helper function: seed system roles for an org
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION seed_org_system_roles(target_org_id UUID)
RETURNS VOID AS $$
DECLARE
  v_role_id UUID;
  v_viewer_id UUID;
  v_tester_id UUID;
  v_admin_id UUID;
  v_owner_id UUID;
BEGIN
  -- Viewer
  INSERT INTO custom_roles (org_id, name, description, is_system, system_role_key)
  VALUES (target_org_id, 'Viewer', 'Can view all content and reports', TRUE, 'viewer')
  ON CONFLICT (org_id, system_role_key) DO NOTHING
  RETURNING id INTO v_viewer_id;

  -- Tester
  INSERT INTO custom_roles (org_id, name, description, is_system, system_role_key)
  VALUES (target_org_id, 'Tester', 'Can create and update test content', TRUE, 'tester')
  ON CONFLICT (org_id, system_role_key) DO NOTHING
  RETURNING id INTO v_tester_id;

  -- Admin
  INSERT INTO custom_roles (org_id, name, description, is_system, system_role_key)
  VALUES (target_org_id, 'Admin', 'Can manage projects, members, and integrations', TRUE, 'admin')
  ON CONFLICT (org_id, system_role_key) DO NOTHING
  RETURNING id INTO v_admin_id;

  -- Owner
  INSERT INTO custom_roles (org_id, name, description, is_system, system_role_key)
  VALUES (target_org_id, 'Owner', 'Full access including restricted permissions', TRUE, 'owner')
  ON CONFLICT (org_id, system_role_key) DO NOTHING
  RETURNING id INTO v_owner_id;

  -- If roles already existed, fetch their IDs
  IF v_viewer_id IS NULL THEN
    SELECT id INTO v_viewer_id FROM custom_roles WHERE org_id = target_org_id AND system_role_key = 'viewer';
  END IF;
  IF v_tester_id IS NULL THEN
    SELECT id INTO v_tester_id FROM custom_roles WHERE org_id = target_org_id AND system_role_key = 'tester';
  END IF;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM custom_roles WHERE org_id = target_org_id AND system_role_key = 'admin';
  END IF;
  IF v_owner_id IS NULL THEN
    SELECT id INTO v_owner_id FROM custom_roles WHERE org_id = target_org_id AND system_role_key = 'owner';
  END IF;

  -- Viewer permissions: all page + all :read + report:view
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_viewer_id, id FROM permissions
  WHERE level = 'page'
     OR action = 'read'
     OR (resource = 'report' AND action = 'view')
  ON CONFLICT DO NOTHING;

  -- Tester permissions: Viewer + all :create, :update, :submit + section/manage, requirement/manage, tag/manage + all :update_own, :delete_own
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_tester_id, id FROM permissions
  WHERE level = 'page'
     OR action IN ('read', 'create', 'update', 'submit')
     OR (resource IN ('section', 'requirement', 'tag') AND action = 'manage')
     OR action IN ('update_own', 'delete_own')
  ON CONFLICT DO NOTHING;

  -- Admin permissions: Tester + all :delete + member/manage, integration/manage, organization/manage, jira/push
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_admin_id, id FROM permissions
  WHERE level = 'page'
     OR action IN ('read', 'create', 'update', 'submit', 'delete')
     OR (resource IN ('section', 'requirement', 'tag', 'member', 'integration', 'organization') AND action = 'manage')
     OR (resource = 'jira' AND action = 'push')
     OR action IN ('update_own', 'delete_own')
  ON CONFLICT DO NOTHING;

  -- Owner permissions: everything
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_owner_id, id FROM permissions
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 9. Triggers
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_custom_roles_updated_at ON custom_roles;
CREATE TRIGGER update_custom_roles_updated_at
  BEFORE UPDATE ON custom_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_groups_updated_at ON user_groups;
CREATE TRIGGER update_user_groups_updated_at
  BEFORE UPDATE ON user_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
