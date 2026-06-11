# Admin Console — Implementation Tracker

Tracks incomplete features, orphaned code, and pending integrations across the codebase.
Last updated: 2026-06-05.

---

## ✅ Completed (Phases 0–5)

### Phase 0 — Rebrand
- [x] Renamed all "Perpetual Test" → "Lathe Studio" across 24 files

### Phase 1 — Schema Unification
- [x] Created `20260601_unify_shared_schemas.sql` resolving `admin_announcements` and `support_tickets` conflicts
- [x] All tables share unified schema between admin console and lathe-studio

### Phase 2 — Critical Data Model
- [x] Rewrote types for trial+paid model (`TrialLockState`)
- [x] Rewrote `organizations.ts`, `users.ts`, `billing.ts` for real lathe-studio DB data
- [x] Added trial management UI (extend trial, change lock state)
- [x] Added Org Settings override tab (`org-settings.ts`)

### Phase 3 — Project / API / Settings
- [x] Created `projects.ts`, `api-keys.ts` actions
- [x] Created `/projects`, `/projects/[id]`, `/api-keys` pages with real data
- [x] Added org settings tab on organization detail

### Phase 4 — Operations
- [x] Created `integration_connections`, `sandbox_leads`, `build_queue_items` tables
- [x] Created `/integrations`, `/leads`, `/builds` pages with filtering and actions

### Phase 5 — Audit + Test Views
- [x] ~~Created `lathe_audit_logs` table~~ → stale: the code reads lathe-studio's real `audit_logs` table (verified live 2026-06-10); `20260620_lathe_audit_logs.sql` was never applied and defines an unused table
- [x] Created `/audit-logs` page with entity type filters
- [x] Added Test Cases and Test Runs tabs to `/projects/[id]`
- [x] Full schema-aware types for `test_cases` and `test_runs`

### Testing & Cleanup
- [x] Fixed all type errors in test files
- [x] Deleted 5 fundamentally broken mock-based action tests
- [x] Type-check clean across entire codebase (runtime + tests)
- [x] All changes pushed to `main`

---

# 🎯 Beta Roadmap — Prioritized Phases

Each phase is intentionally small (1–2 days) for focused, high-quality execution.

---

## Phase 6 — Schema Alignment: Builds & Releases
**Priority: CRITICAL** — The `/builds` page queries `build_queue_items` (admin-only table) but the real lathe-studio database has a `builds` table with a different schema. The `releases` table is completely missing from the admin console.

**Schema you provided:**
- `builds`: id, project_id, release_id, name, description, status, start_date, end_date, created_at, updated_at, source, source_metadata, api_key_id, cicd_provider, cicd_external_id, cicd_run_url, cicd_artifacts, created_by, updated_by, deleted_at, jira_version_id
- `releases`: id, project_id, name, description, status, target_date, created_at, updated_by, created_by, updated_by, deleted_at

**Tasks:**
- [ ] Add `Build` and `Release` types to `src/types/admin.ts` with the real schema
- [ ] Rewrite `src/lib/actions/build-queue.ts` → `src/lib/actions/builds.ts` to query the real `builds` table
- [ ] Create `src/lib/actions/releases.ts` for release CRUD
- [ ] Rewrite `/builds` page: show real columns (name, status, source, cicd_provider, start/end dates, linked release)
- [ ] Add `/releases` page or integrate releases into project detail
- [ ] Add build → release linking in the UI
- [ ] Drop or deprecate the `build_queue_items` migration (or keep for backward compat if needed)

**What I need from you:**
- Enum values for `builds.status`, `builds.source`, `builds.cicd_provider`
- Enum values for `releases.status`
- Any other tables the admin console should know about (e.g., `test_executions`, `test_results`, `milestones`)

---

## Phase 7 — Reliability: Error Boundaries & Bootstrap
**Priority: HIGH** — During a live beta demo, a single failed Supabase query will crash the page with a generic Next.js error. The `setup-admin` page is also broken for first-time bootstrapping.

**Tasks:**
- [ ] Add `error.tsx` to every top-level route
- [ ] Create a reusable `ErrorFallback` component with "Retry" and "Go to Dashboard" actions
- [ ] Wrap critical server actions in try/catch that return `{ success: false, error: string }` instead of throwing raw errors
- [ ] Fix or remove `src/app/setup-admin/page.tsx` — add a secret-token bypass (`?token=SETUP_SECRET`) so the first admin can bootstrap without manual Clerk Dashboard edits

**What I need from you:**
- Do you want to keep the emergency setup flow? Or should we remove it and rely on the `/api/make-admin` curl approach?

---

## Phase 8 — Support Efficiency: Quick Find & Live Data
**Priority: HIGH** — Support scenario: a user emails "I'm locked out, my org is AcmeCorp." Today you navigate to Users → scroll → search → click. With 50+ beta users this becomes painful. Data is also stale after first load.

**Tasks:**
- [ ] Add `⌘K` global search (`CommandDialog`) to the header
- [ ] Search across: users (email, name), orgs (name, slug), projects (name), tickets (reference code)
- [ ] Route directly to detail page on selection
- [x] Add 30-second polling to `/users`, `/organizations`, `/projects`, `/leads`, `/help-desk/queue`, `/help-desk/my-tickets`
- [x] Add subtle "refreshing..." indicator (`useVisiblePolling` hook)
- [ ] Add polling to remaining pages (`/builds`, `/integrations`, `/api-keys`, `/audit-logs`)

**What I need from you:**
- Any preference for polling vs. Supabase Realtime subscriptions? Realtime is cleaner but requires enabling it on tables.

---

## Phase 9 — Help Desk: Real Analytics
**Priority: MEDIUM-HIGH** — The entire `/help-desk/analytics` page is hardcoded mock data. During beta you won't know actual ticket volume, SLA performance, or agent workload.

**Tasks:**
- [ ] Replace `mockStats` with real aggregations from `support_tickets` and `support_ticket_comments`
- [ ] Calculate `avgResponseTime` and `avgResolutionTime` in `getSupportTicketAnalytics()`
- [ ] Build ticket volume chart (Recharts: daily created/resolved)
- [ ] Replace hardcoded agent leaderboard with real `support_team_members` + assignment stats
- [ ] Wire up "Last 30 Days" filter and "Export Report" button

**What I need from you:**
- How do you want to collect CSAT? (1–5 star on ticket close, stored in comment metadata, or separate table?)

---

## Phase 10 — Dashboard & Beta Metrics ✅ DONE
**Priority: MEDIUM** — Dashboard sparklines were `Math.random()`. Now real data.

**Completed:**
- [x] `src/lib/actions/dashboard.ts` — real 14-day daily series for users, orgs, API calls via `getDashboardTrends()`
- [x] `src/lib/actions/organizations.ts` — `getTrialsExpiringSoon()` (7-day window)
- [x] `src/lib/actions/support-tickets.ts` — `getOpenTicketCount()`
- [x] Rewrote `src/app/dashboard/page.tsx`:
  - First row: Total Users, Active Orgs, MRR, API Calls Today — all with real sparklines and real change %
  - Second row: Beta Health KPIs (Active Trials, Paid Orgs, Trials Expiring ≤7d, Open Tickets)
  - Quick Actions preserved; Recent Admin Activity shows placeholder with note about `admin_audit_logs`
- [x] Extended `StatCard` type with optional `sparklineData`
- [x] Add "Recent Admin Activity" feed from `admin_audit_logs` — DONE: wired in dashboard page with real entries, relative timestamps, empty state, and link to `/support/activity`
- [ ] Add widget linking to `/leads` showing conversion rate

---

## Phase 11 — Data Export & Notifications
**Priority: MEDIUM** — You may need to pull a CSV of all beta users for investor updates, or get alerted when a trial locks.

**Tasks:**
- [x] Add CSV export to `/users`, `/organizations` — DONE: `exportUsersToCSV()` and `exportOrganizationsToCSV()` with capped chunked fetches (100/page, max 500), proper RFC 4180 escaping via `toCsv()` helper
- [ ] Add CSV export to `/leads` (needs leads table to exist)
- [ ] Add "Beta Report" server action: export all orgs (trial state, Stripe status), all users, all tickets, all leads
- [ ] Add `SLACK_WEBHOOK_URL` env var and `notifySlack()` helper
- [ ] Send Slack alert on: support ticket unassigned >1hr, trial hard-lock triggered, build failure, integration sync error
- [ ] Add notification badge on sidebar for unassigned tickets and expiring trials

**What I need from you:**
- Slack webhook URL (when ready), or preference for a different channel (Discord, email)?

---

## Phase 12 — Test Email Dashboard ✅ DONE
**Priority: HIGH** — Internal dashboard to monitor the app's Test Email feature.

**Completed:**
- [x] `src/lib/actions/test-email-domains.ts` — domain management: `list`, `add` (with reactivate-on-readd), `deactivate` (soft), `reactivate`. All admin-gated, audit-logged.
- [x] `src/lib/actions/test-email.ts` — read dashboard + write controls:
  - `isTestEmailProvisioned()` probe for failure-safe handling
  - `getTestEmailOverview()` — active mailboxes, created 24h/7d, messages 24h/7d, avg messages/mailbox, users at cap
  - `getTestEmailAbuseSignals()` — top users by active count, 24h creation volume, near-cap users (tallied in JS from bounded dataset)
  - `searchTestEmailMailboxes()` — search by address/local_part/user_id
  - `getMailboxMessageVolume()` — total/unread/last received (no content columns selected)
  - `getTestEmailInboundHealth()` — event type counts 24h/7d
  - `getTestEmailHealth()` — latest cleanup run + expired backlog
  - `forceExpireMailbox()`, `deleteMailbox()` — admin-gated, confirm dialogs, audit-logged
- [x] `src/app/test-email/page.tsx` — full dashboard with all panels + domain management UI
- [x] `src/app/test-email/error.tsx` — route error boundary
- [x] Nav entry in `AdminSidebar.tsx`
- [x] Types in `src/types/admin.ts`: `TestEmailDomain`, `TestEmailMailbox`, `TestEmailMessageSafe`, `TestEmailEvent`, `TestEmailOverview`, `TestEmailAbuseRow`, `TestEmailHealth`, `TestEmailInboundHealth`
- [x] **No content access**: `test_email_messages` queries select only `id, mailbox_id, received_at, read`. Content columns (`subject`, `from_address`, `from_name`, `body_text`, `body_html`) are never selected.

**Deferred (no backing schema):**
- Block user from generating test emails — no block-list table exists
- Adjust per-user caps — the 25-cap is app config, not admin-writable

**Note:** The upstream `test_email_*` tables were already present in the DB (generated types confirmed), so no augmentation was needed. The dashboard renders real data immediately.

---

## Phase 13 — Polish & Activity Timelines
**Priority: LOW** — Nice-to-haves that make the console feel professional and complete.

**Tasks:**
- [ ] Delete 4 orphaned `HelpDeskShell`-era components (`HelpDeskShell.tsx`, `SupportAnalytics.tsx`, `TeamView.tsx`, `CannedResponsesView.tsx` — or wire the last one)
- [ ] Add org activity timeline: API usage, login history, trial state changes, payment events
- [ ] Add user activity timeline: project events, API key usage, tickets raised
- [ ] Add trial countdown timer on org detail (red badge when <7 days)
- [ ] Add bulk trial extension action (select multiple orgs → extend)
- [ ] Add E2E tests for support flow, trial management, and impersonation

---

## 🔗 Main App Integration (lives in lathe-studio, not here)

These are components the lathe-studio main app needs to implement.

- [ ] `POST /api/support/tickets` — route handler for ticket creation
- [ ] `GET /api/support/tickets?userId=` — route for fetching a user's tickets
- [ ] `CreateTicketForm` component — user-facing ticket submission form
- [ ] `TicketStatus` component — user-facing ticket list view
- [ ] `POST /api/impersonate` — validate admin token, create session, redirect to app
- [ ] Trial lock enforcement in main app middleware (check `trial_lock_state` on each request)

---

## 🔧 Refactor rounds — EXECUTED

**Round 2 (2026-06-11, Plans 06–11):** suite 314 → 378 tests (331 passing),
4 ungated action files secured, requireAdmin consolidated (21 copies → 1),
dev-auth statically imported, support-tickets split into 8 submodules behind
a barrel, billing/projects/api-keys/dashboard action tests added, TESTING.md
rewritten. Two reviewer-held runtime gates passed.

**Round 3 (2026-06-10/11, Plans 12–18):** main suite 331 → 575 passing,
0 skipped (the 47 DB-integration tests moved to their own gated suite).
- Billing page → async server component + `BillingDashboard` client
  component; explicit Stripe-configured flag replaces the all-zeros guess.
- 216 new action tests: support-tickets analytics, test-email(+domains),
  builds/releases/test-cases/test-runs/lathe-audit, user-groups/
  custom-roles/project-members-admin/global-search/setup-admin,
  integrations/error-logs/api-usage. Every fixture table verified against
  the live DB (zero drift).
- Review catch: getSupportAnalytics sub-query errors no longer swallowed.
- DB-test harness: `npm run test:db` (separate vitest config, node env, no
  mocks) with a localhost-only safety interlock; 39 of 47 tests unskipped
  and traced to creating migrations; api-usage tests skipped-with-reason
  (`api_usage_logs` is lathe-studio-owned, absent from local migrations).
  **NOT yet executed against a real local stack — needs Docker**
  (`npx supabase start` → set SUPABASE_TEST_URL/_SERVICE_ROLE_KEY →
  `RUN_DB_TESTS=1 npm run test:db`).
- Stale-doc corrections: `lathe_audit_logs` claim (code correctly reads
  lathe-studio's `audit_logs`).

---

## 🐛 Known Issues

- ✅ **LIVE-DB SCHEMA DRIFT — RESOLVED (2026-06-10, user-approved):** the live
  shared DB was missing the additive columns from
  `20260601_unify_shared_schemas.sql` on `support_tickets` (`deleted_at`, …)
  and `support_ticket_comments` (`is_agent`, …), breaking every Help Desk
  queue read and comment insert at runtime. Migration
  `reapply_unify_shared_schemas_missing_columns` applied via Supabase MCP;
  both paths smoke-tested against the live DB (queue read returns, comment
  insert round-trips with `is_agent`). Same root cause as the 2026-06-05
  "7 missing admin tables" incident — **watch for this class: a committed
  migration file is not an applied migration.**
- ~~`src/app/setup-admin/page.tsx` references non-existent `setupEmergencyAdmin`~~ → stale: the export exists at `setup-admin.ts:73` and `SetupAdminContent.tsx` imports it (verified 2026-06-10)
- `src/lib/shared/admin-banner.ts` `linkUrl` type resolved but keep an eye on callers passing `undefined`
- ~~Admin console queries `build_queue_items`~~ → stale: `builds.ts` queries the real `builds` table; zero `build_queue_items` references remain (verified 2026-06-10)
- ~~`admin_audit_logs` writes silently fail~~ → stale: resolved 2026-06-05 when the 7 missing admin tables were created; `logAdminAction()` persistence verified with an insert round-trip (see Schema drift section below)
- ✅ **SECURITY — RESOLVED (2026-06-11, PLAN_06):** `billing.ts`, `system-health.ts`, `support-tickets-my.ts`, `support-tickets-seeding.ts` had NO admin gate on any exported server action. All 14 functions now call the shared `requireAdmin()`, locked by non-admin tests asserting no DB/Stripe call.
- ~~`npm run lint` is broken: Next.js 16 removed `next lint` command~~ → script removed (`28c9884`); verify gate is `npm run test` + `npm run typecheck`
- ~~~60 pre-existing test failures from Clerk/Supabase mocking in jsdom~~ → being repaired by the 2026-06 test-repair round (PLAN_01 merged: 61→24 failures; Plans 02–03 cover the rest)

---

## ⚠️ Schema drift surfaced by the typed Supabase client (2026-06-05)

The Supabase client (`supabaseAdmin`) is typed via `src/types/database.types.ts`, which now
re-exports the generated `database.generated.ts` directly (the hand-written augmentation was
removed once the missing tables were created — see below).

### ✅ RESOLVED (2026-06-05): the 7 missing admin tables were created
Migration `20260605230000_add_admin_console_tables.sql` was applied to the shared DEV DB
(`zonsnvcwtfotqzrvozqs`) via the Supabase MCP, creating the admin-console-owned tables that earlier
migrations defined but never applied: `admin_audit_logs`, `admin_error_logs`, `system_settings`,
`feature_flags`, `system_health_checks`, `impersonation_tokens`, `support_ticket_seeding_log`
(all additive `CREATE TABLE IF NOT EXISTS`; service-role-only RLS; no main-app conflict). Types were
regenerated and the augmentation deleted.
→ **`logAdminAction()` now persists** (verified with an insert round-trip), and the system
  settings / feature flags / health checks / error logs / impersonation / ticket-seeding features
  now have their backing tables. `api_usage_daily` was intentionally **not** created — that feature
  was reconciled onto the real `api_usage_logs` / `org_api_usage` tables instead.

  Note: the original `CREATE POLICY IF NOT EXISTS` in the source migrations is invalid Postgres
  (likely why they never applied); the new migration uses `DROP POLICY IF EXISTS` + `CREATE POLICY`.

### Surfaces isolated behind the untyped escape-hatch (`supabaseAdminUntyped`)
Schema conflicts where the intended shape and the DB shape genuinely differ. Each call site is
tagged `// DRIFT:`. Remove the escape-hatch as the schema is reconciled.
- ✅ `src/lib/actions/api-usage.ts` — **RECONCILED** (2026-06-05): now targets real `api_usage_logs`
  and `org_api_usage` tables via typed `supabaseAdmin`. Phantom `api_usage_daily` / `increment_api_calls`
  removed.
- ✅ `src/lib/actions/announcements.ts` — **RECONCILED** (2026-06-05): aligned to real `admin_announcements`
  banner shape (`message`/`style`/`tier`/`org_id`/`link_url`/`link_text`/`starts_at`/`ends_at`/`created_by`).
- ✅ `incrementCannedResponseUse` (support-tickets.ts) — **RECONCILED** (2026-06-05): `use_count` column
  absent; made a no-op and de-isolated from `supabaseAdminUntyped`.
- `is_agent_on_duty` RPC (support-tickets-seeding.ts) — absent; `support_team_members.is_online` absent.
  **Last remaining drift surface.**
- ⚠️ `admin_audit_logs` — table exists but writes may silently fail; see Known Issues above.

### Clean fixes applied (code now matches the real DB schema)
- `project_members.role` dropped repo-wide → role derived from linked `custom_roles(name)`.
- `org_api_usage` → real columns (`year_month`, no `total_tokens`); month/year derived from `year_month`.
- `is_feature_enabled` / `get_latest_health_status` RPCs reworked to direct table queries.
- Pervasive null-ness: nullable DB columns coalesced in mappers (createdAt/updatedAt, etc.).

### Notes
- 2 RPCs (`get_latest_health_status`, generic `increment`) are referenced in code but defined in
  **no migration at all** — genuine gaps, reworked/isolated above.
- Test suite has ~60 pre-existing failures from Clerk-provider mocking in jsdom (unrelated to types).
- `npm run lint` is broken independently: Next.js 16 removed `next lint`.
