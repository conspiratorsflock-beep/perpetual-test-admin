# Schema Reconciliation Plan — Admin Console (2026-06-05)

**Audience:** Kimi Code. **Author:** architect. **Input:** the authoritative `Schema.md` (current DB
dump). **Goal:** reconcile admin code against the real schema now that we have ground truth — finish
de-isolating the surfaces that were parked behind `supabaseAdminUntyped`, and update the drift docs.

## Context / what Schema.md tells us
- The typed client (`database.generated.ts`) was generated from this same DB and **matches Schema.md
  exactly** — every typed query is already correct. **No regeneration or typed-code fixes needed.**
- Schema.md confirms which tables genuinely **do not exist**, which lets us now point the previously
  "drifted/isolated" code at the **real** tables (where they exist) and stop guessing.
- Keep `tsc --noEmit` and `next build` green; don't regress the 0-error / green-build state.

---

## P0 — Reconcile `api-usage.ts` to real tables (remove the phantom `api_usage_daily`)
[src/lib/actions/api-usage.ts](../src/lib/actions/api-usage.ts) currently targets `api_usage_daily`
(absent) + the `increment_api_calls` RPC (absent), and is isolated behind `supabaseAdminUntyped`.
Real tables exist:
- **`api_usage_logs`** — raw per-call rows: `org_id, endpoint, method, status_code, error, created_at`.
- **`org_api_usage`** — monthly rollup per org: `org_id, year_month, total_calls, quota, overage_count`.

Only consumer is [dashboard/page.tsx](../src/app/dashboard/page.tsx), which uses **only**
`getApiCallsToday` and `getApiCallsComparison`. Rework:
- `getApiCallsToday` → `api_usage_logs` count where `created_at >= start-of-today` (typed client,
  `count: "exact", head: true`).
- `getApiCallsComparison` → two counts (today, yesterday) on `api_usage_logs`.
- `getApiCallsThisMonth` → either count `api_usage_logs` for the month, or sum `org_api_usage.total_calls`
  for the current `year_month`.
- `getApiUsageHistory` (daily breakdown, **currently unused**) → either rework to N per-day counts on
  `api_usage_logs`, or delete it and the `ApiUsageRecord` interface if confirmed unused. Don't fetch
  whole-table rows to tally breakdowns.
- `recordApiCall` → `insert` into `api_usage_logs` instead of the missing RPC.
- Switch the file back to the **typed `supabaseAdmin`** and remove the `// DRIFT:` header.

## P0 — Fix canned-response `use_count` (column doesn't exist)
`support_canned_responses` has no `use_count` (Schema.md: only `title, content, category, tags,
is_active, created_by, …`). In [support-tickets.ts](../src/lib/actions/support-tickets.ts):
- `getCannedResponses` (~line 362) `.order("use_count")` → order by `created_at` (or `title`).
- `incrementCannedResponseUse` (~line 377) — no column to increment: make it a no-op (keep the export
  to avoid breaking callers) **or** remove it and its call sites. Drop the `supabaseAdminUntyped`
  `increment` RPC and the `// DRIFT:` note.

---

## P1 — Align announcements to the real banner table (DECISION MADE: option A)
The admin Announcements feature *authors* the banners that **lathe-studio displays to end users**;
nothing renders in the admin app. It's currently coded against a CMS shape that doesn't exist. Align
everything to the real `admin_announcements` table and **de-isolate** from `supabaseAdminUntyped`.

**Real table (Schema.md) → use these columns:** `id, message, style, tier, org_id, link_url,
link_text, starts_at, ends_at, created_by (text), created_at, updated_at`.

**Field mapping (old admin shape → real):**
| old (admin CMS) | new (real table) | notes |
|---|---|---|
| `title` | — | dropped; fold any title into `message` |
| `content` | `message` | the single banner text |
| `type` (info/warning/critical/maintenance) | `style` | **same 4 values** — keep the union type, it now feeds `style` |
| `targetTiers: string[]` | `tier: string` | single tier; form picks one. Default `"all"` (confirm valid tier values with main app) |
| `targetOrgs: string[]` | `org_id: string \| null` | optional single-org targeting; leave `null` in the basic form |
| `isActive: boolean` | — | dropped; "active" = now within `[starts_at, ends_at]`. Show a computed Active/Scheduled/Expired badge |
| `linkUrl` / `linkText` | `link_url` / `link_text` | keep (optional) |
| `createdByEmail` | — | dropped; `created_by` is the Clerk user id (text) |

**Files to change:**
1. **Types (two copies, keep them identical):** [src/types/admin.ts](../src/types/admin.ts) (~L243) and
   [src/lib/shared/admin-banner.ts](../src/lib/shared/admin-banner.ts) (~L12) — replace
   `AdminAnnouncement` with the real shape above. Keep `AnnouncementType` (4 values) but it now
   represents `style`.
2. **Actions:** [src/lib/actions/announcements.ts](../src/lib/actions/announcements.ts) — rewrite
   CRUD to the real columns, switch back to the **typed `supabaseAdmin`**, drop the `// DRIFT:` header.
   - `getAnnouncements` / `getActiveAnnouncements`: map real columns; "active" = `starts_at <= now AND
     (ends_at IS NULL OR ends_at > now)`.
   - `createAnnouncement` / `updateAnnouncement`: take `message, style, tier, orgId?, linkUrl?,
     linkText?, startsAt?, endsAt?`; `created_by` = current Clerk user id (no email).
   - `toggleAnnouncementActive` → repurpose to **"expire now"** (set `ends_at = now()`), or remove it.
   - `logAdminAction` `targetName`: use a truncated `message` instead of `title`.
3. **Shared banner kit (used by the main app + the admin debug page):**
   [get-announcements.ts](../src/lib/shared/get-announcements.ts),
   [admin-banner.ts](../src/lib/shared/admin-banner.ts) helpers (`filterAnnouncements` → filter by
   single `tier`; `bannerStyles`/icons are keyed by the same 4 style values),
   [AdminBanner.tsx](../src/lib/shared/AdminBanner.tsx) (render `message`/`style`, not `title`/`content`/`type`).
4. **UI:** [support/announcements/page.tsx](../src/app/support/announcements/page.tsx) — form fields
   become: **message** (textarea), **style** (select, 4 values), **tier** (select, default "all"),
   **starts/ends** (existing datetime inputs), optional **link url/text**. Remove the title input and
   the `is_active` toggle (replace with the computed status badge). Update the list rows to render
   `message`/`style`/`tier`.
5. **Debug page:** [support/announcements/debug/page.tsx](../src/app/support/announcements/debug/page.tsx)
   — verify it compiles against the new field names (it just calls `getActiveAnnouncements`).

Result: admins can create real, working banners that lathe-studio renders; `supabaseAdminUntyped`
no longer used by announcements.

---

## P2 — Update the drift docs to match Schema.md ground truth
In [TODO.md](../TODO.md) "Schema drift surfaced by the typed Supabase client":
- Move `api_usage_daily` out of the "missing tables" list — it's now reconciled to
  `api_usage_logs`/`org_api_usage` (P0).
- Note the remaining **genuinely homeless** admin concepts confirmed by Schema.md (no real table):
  `system_settings, feature_flags, system_health_checks, admin_audit_logs, admin_error_logs,
  impersonation_tokens, support_ticket_seeding_log`, and `is_agent_on_duty` (no agent-schedule table).
  These stay runtime-gaps until the admin migrations are applied to the DB.
- **Call out explicitly:** `admin_audit_logs` is absent, so `logAdminAction()` (a CLAUDE.md "critical
  rule") **silently fails on every admin write** (errors are caught/logged). Admin action auditing is
  non-functional until that table exists. This is the highest-impact gap to resolve via migration.

## P3 — Housekeeping
- Move `Schema.md` from the repo root into `docs/` (e.g. `docs/Schema.md`) as the schema reference,
  or add it to `.gitignore` if it shouldn't be committed — confirm preference. Don't leave a 43KB dump
  loose at the root.

## Out of scope (flag, don't do)
- Applying admin migrations to the shared DB (creates the 7 homeless tables) — needs main-app
  coordination; that's the real fix for the runtime gaps but a separate decision.
- Optional enhancements Schema.md enables (e.g. surfacing org trial-timeline columns
  `trial_warning_sent_at` / `trial_soft_lock_sent_at` / `trial_hard_lock_sent_at` in trial management).

## Verification
1. `npx tsc --noEmit` → 0 errors; `npm run build` → green.
2. After P0+P1: `grep -rn "supabaseAdminUntyped\|// DRIFT" src` should show **only** the
   `is_agent_on_duty` call in [support-tickets-seeding.ts](../src/lib/actions/support-tickets-seeding.ts)
   (the one surface with no real table) — api-usage, canned `increment`, and announcements are all
   de-isolated.
3. Dashboard still renders today's API-call count + comparison without errors.
4. No new test failures beyond the known pre-existing Clerk-mock set (~62).
