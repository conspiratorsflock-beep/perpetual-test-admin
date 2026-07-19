# Migration Ownership Inventory

**Scope:** every file in `supabase/migrations/` in this repo.  
**Goal:** classify ownership (local-dev-only baseline / admin-console-owned / shared-table overlap), record live tracker status, document known drift, and propose a zero-schema-change prod cutover sequence.

## Methodology

1. Read each migration file.
2. Classify by the tables it creates or alters:
   - **local-dev-only baseline** — recreates lathe-studio tables with `IF NOT EXISTS` so a fresh local stack can boot; no-op on shared dev/prod.
   - **admin-console-owned** — tables/objects only the admin console reads/writes (`admin_*`, `feature_flags`, `impersonation_tokens`, `system_settings`, `test_email_domains`, etc.).
   - **shared-table overlap** — tables the main lathe-studio app also depends on, or tables both apps write to.
3. Note live tracker status. A query against `supabase_migrations.schema_migrations` on the shared DEV project was attempted but could not be completed because the local Docker daemon is not running and no direct DB password was available in this session. Tracker state is therefore marked **unverified** for every file.

## Inventory

| # | Filename | Classification | Live tracker state | Notes |
|---|----------|----------------|--------------------|-------|
| 1 | `20260309000000_lathe_studio_baseline_for_local.sql` | local-dev-only baseline | unverified | `CREATE TABLE IF NOT EXISTS` for `organizations`, `api_keys`, `project_members`, `projects`. Explicitly documented as local-test-stack only; never the source of truth on shared DBs. |
| 2 | `20260310_admin_console.sql` | admin-console-owned | unverified | Creates the original admin console tables: `admin_audit_logs`, `feature_flags`, `impersonation_tokens`, `admin_announcements` (with `target_tiers` array), `system_health_checks`, `admin_error_logs`. |
| 3 | `20260312_api_calls_tracking.sql` | admin-console-owned (reconciled/dead) | unverified | Creates `api_usage_daily` with a JSONB breakdown shape. Superseded by a different shape in `20260601_unify_shared_schemas.sql`; the feature is intentionally dead in code. |
| 4 | `20260313_support_tickets.sql` | shared-table overlap | unverified | Creates the full help-desk ticket system (`support_tickets`, `support_ticket_comments`, `support_ticket_events`, `support_canned_responses`, `support_team_members`, `support_sla_config`). Used by both admin console and lathe-studio. |
| 5 | `20260314_system_settings.sql` | admin-console-owned | unverified | Creates `system_settings` key-value store. |
| 6 | `20260314000000_help_desk_enhancements.sql` | admin-console-owned | unverified | Adds agent schedules/shifts/exceptions, assignment tracking, and seeding log to the help-desk system. |
| 7 | `20260601_unify_shared_schemas.sql` | shared-table overlap / reconciliation | unverified | Reconciles admin and lathe-studio shapes for `admin_announcements`, `support_tickets`, `support_sla_config`, `support_team_members`; re-creates admin-only tables with the unified shape. |
| 8 | `20260605230000_add_admin_console_tables.sql` | admin-console-owned | unverified | Backfills tables that were missing on the shared DB (`admin_audit_logs`, `feature_flags`, `impersonation_tokens`, `system_health_checks`, `admin_error_logs`, `system_settings`, `support_ticket_seeding_log`). |
| 9 | `20260605233000_add_test_email_domains.sql` | admin-console-owned / shared read | unverified | Creates `test_email_domains`. Admin console manages the registry; the main app is expected to read it for inbound/outbound domain allowlisting. |
| 10 | `20260611160000_pin_search_path_updated_at_fn.sql` | admin-console-owned | unverified | Security hardening: pins `search_path` on `update_updated_at_column()`. |
| 11 | `20260615_phase4_operational_tables.sql` | shared-table overlap | unverified | Creates `integration_connections`, `sandbox_leads`, `build_queue_items` — all consumed by the admin console dashboards and written by lathe-studio integrations/webhooks. |
| 12 | `20260620_lathe_audit_logs.sql` | shared-table overlap | unverified | Creates `lathe_audit_logs` for app-level audit events written by lathe-studio and viewed in the admin console. |
| 13 | `20260621_rbac_custom_roles_groups.sql` | shared-table overlap | unverified | Creates `permissions`, `custom_roles`, `role_permissions`, `user_groups`, `group_memberships`, `project_group_access`; adds `custom_role_id`/`assigned_via_group_id` to `project_members`. Core to lathe-studio's role model, surfaced in admin console user/group pages. |
| 14 | `20260622_api_quota_usage.sql` | shared-table overlap | unverified | Adds quota/usage columns to `api_keys` and `organizations`; creates `org_api_usage`. Quota is managed in admin console and enforced by lathe-studio API paths. |

**File count:** 14 (the plan initially referenced 10; this report documents the drift).

## Known schema drift: `admin_announcements.tier`

### Current repo migrations vs. live shape

- `20260310_admin_console.sql` creates `admin_announcements` with a `target_tiers TEXT[]` column and a `type TEXT` column.
- `20260601_unify_shared_schemas.sql` re-creates `admin_announcements` with `link_url` / `link_text` but still does **not** add a single `tier` column.
- The live database (per `docs/Schema.md` and the admin console code) has a single `tier` `text` column.

### CHECK values in the live DB

The admin console code constrains `tier` to:

```typescript
const announcementTier = z.enum(["all", "basic", "pro", "enterprise"]);
```

This implies a live DB `CHECK` allowing `all | basic | pro | enterprise`.

### Where `tier` is read and written in this repo

**Reads:**
- `src/lib/actions/announcements.ts:16`, `:35`, `:54` — `getAnnouncements` and `getActiveAnnouncements` select and map `tier`.
- `src/lib/shared/get-announcements.ts:30`, `:59`, `:84` — shared helper reads `tier` for filtering by user tier.
- `src/app/support/announcements/debug/page.tsx:38–40`, `:98`, `:113–114` — debug UI reads `tier` for display and filter diagnostics.

**Writes:**
- `src/lib/actions/announcements.ts:69–76` — `createAnnouncement` schema validates `tier`.
- `src/lib/actions/announcements.ts:112` — insert defaults to `"all"`.
- `src/lib/actions/announcements.ts:143–178` — `updateAnnouncement` schema validates and writes `tier`.

### Implication

The admin console still assumes a tiered pricing model (`free`/`basic`/`pro`/`enterprise`) while lathe-studio has moved to a trial + paid-only model. `admin_announcements.tier` is therefore a product-model mismatch, not merely a naming issue. Fixing it is out of scope for this zero-schema-change inventory, but it must be resolved before the admin console and lathe-studio share a single source of truth for announcements.

## Proposed production cutover sequence

This sequence assumes the admin console will share a Supabase project with lathe-studio. No schema changes are proposed here.

1. **Pre-cutover audit**
   - Run `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;` on prod.
   - Compare the result against the 14 filenames above.
   - Resolve any missing or out-of-order entries before proceeding.

2. **Apply local-dev-only baseline verification**
   - Confirm `20260309000000_lathe_studio_baseline_for_local.sql` is **not** needed on prod (all tables it guards already exist and are owned by lathe-studio migrations).

3. **Apply admin-console-only migrations**
   - `20260310_admin_console.sql`
   - `20260314_system_settings.sql`
   - `20260314000000_help_desk_enhancements.sql`
   - `20260605230000_add_admin_console_tables.sql`
   - `20260605233000_add_test_email_domains.sql`
   - `20260611160000_pin_search_path_updated_at_fn.sql`
   - Note: `20260312_api_calls_tracking.sql` should be skipped or verified dead; do not create the obsolete `api_usage_daily` shape on prod.

4. **Apply shared-table migrations in dependency order**
   - `20260313_support_tickets.sql`
   - `20260601_unify_shared_schemas.sql`
   - `20260615_phase4_operational_tables.sql`
   - `20260620_lathe_audit_logs.sql`
   - `20260621_rbac_custom_roles_groups.sql`
   - `20260622_api_quota_usage.sql`

5. **Post-cutover verification**
   - Re-run `supabase_migrations.schema_migrations` query and confirm all expected versions are present.
   - Run admin console smoke tests against prod (sign-in, dashboard, org list, help desk, announcements).
   - Confirm `admin_announcements.tier` behavior is acceptable or schedule the product-model cleanup.

## Important caveats

- **Zero schema changes:** this report changes no SQL files and makes no DDL recommendations beyond the existing cutover sequence.
- **Tracker state is unverified:** because the live DB could not be queried in this session, the "Live tracker state" column must be confirmed during the actual cutover.
- **Dead migration:** `20260312_api_calls_tracking.sql` should not be applied as-is to a clean prod chain because it creates an `api_usage_daily` shape that conflicts with `20260601_unify_shared_schemas.sql`.
- **Product model mismatch:** `admin_announcements.tier` is the most significant piece of drift and should be addressed in a follow-up plan.
