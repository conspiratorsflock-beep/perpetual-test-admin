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
- [x] Created `lathe_audit_logs` table
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
- [ ] Add 30-second polling to `/users`, `/organizations`, `/projects`, `/leads`
- [ ] Add subtle "refreshing..." indicator

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

## Phase 10 — Dashboard & Beta Metrics
**Priority: MEDIUM** — Dashboard sparklines are `Math.random()`. Stakeholders will ask "How's the beta going?" and you'll have no trend data.

**Tasks:**
- [ ] Replace sparkline random data with real historical queries (daily active users, org signups, trial conversions)
- [ ] Add beta-specific stat cards: active trials, trials expiring this week, paid conversions, open support tickets
- [ ] Add "Recent Admin Activity" feed from `admin_audit_logs`
- [ ] Add widget linking to `/leads` showing conversion rate

**What I need from you:**
- Any specific KPIs you want pinned to the dashboard for beta reporting?

---

## Phase 11 — Data Export & Notifications
**Priority: MEDIUM** — You may need to pull a CSV of all beta users for investor updates, or get alerted when a trial locks.

**Tasks:**
- [ ] Add CSV export to `/users`, `/organizations`, `/leads`
- [ ] Add "Beta Report" server action: export all orgs (trial state, Stripe status), all users, all tickets, all leads
- [ ] Add `SLACK_WEBHOOK_URL` env var and `notifySlack()` helper
- [ ] Send Slack alert on: support ticket unassigned >1hr, trial hard-lock triggered, build failure, integration sync error
- [ ] Add notification badge on sidebar for unassigned tickets and expiring trials

**What I need from you:**
- Slack webhook URL (when ready), or preference for a different channel (Discord, email)?

---

## Phase 12 — Polish & Activity Timelines
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

## 🐛 Known Issues

- `src/app/setup-admin/page.tsx` — references non-existent `setupEmergencyAdmin` export from `setup-admin.ts`
- `src/lib/shared/admin-banner.ts` `linkUrl` type resolved but keep an eye on callers passing `undefined`
- Admin console queries `build_queue_items` but lathe-studio uses `builds` (real table) — fixed in Phase 6

---

## ⚠️ Schema drift surfaced by the typed Supabase client (2026-06-05)

The Supabase client (`supabaseAdmin`) is now typed via `src/types/database.types.ts`
(generated `database.generated.ts` + a hand-written augmentation for 8 admin-only tables).
Typing surfaced real drift between the admin code's *intended* schema and the **shared DEV
DB** (`zonsnvcwtfotqzrvozqs`). Root cause: **this repo's admin migrations were never applied
to that DB**, so admin tables/columns/RPCs are missing or conflict with the main app's shapes.

### Admin tables missing from the DEV DB (runtime gap — features will fail until migrations are applied)
These 8 tables are referenced by admin code but **do not exist** in the shared DEV DB. They are
type-augmented in `database.types.ts` so the code compiles, but queries will fail at runtime:
`system_settings`, `feature_flags`, `system_health_checks`, `admin_audit_logs`,
`admin_error_logs`, `impersonation_tokens`, `api_usage_daily`, `support_ticket_seeding_log`.
→ Affected features: system settings, feature flags, health checks, admin audit/error logs,
  user impersonation, API-usage rollups, ticket seeding. **Decision: documented, not fixed** —
  apply the admin migrations to the DB (or point at a DB that has them) to make these work.

### Surfaces isolated behind the untyped escape-hatch (`supabaseAdminUntyped`)
Schema conflicts where the intended shape and the DB shape genuinely differ. Each call site is
tagged `// DRIFT:`. Remove the escape-hatch as the schema is reconciled.
- `src/lib/actions/announcements.ts` — DB `admin_announcements` has the main app's banner shape
  (`message`/`style`/`tier`), not the admin CMS shape (`title`/`content`/`type`/`is_active`/…).
- `src/lib/actions/api-usage.ts` — DB `api_usage_daily` is `count`/`endpoint`/`method`, not the
  `total_calls`/`unique_orgs`/`*_breakdown` shape the code wants; `increment_api_calls` RPC absent.
- `incrementCannedResponseUse` (support-tickets.ts) — generic `increment` RPC + `use_count` column absent.
- `is_agent_on_duty` RPC (support-tickets-seeding.ts) — absent; `support_team_members.is_online` absent.

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
