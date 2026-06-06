# Performance Improvement Plan — Admin Console (2026-06-05)

**Audience:** Kimi Code (mid-level dev). **Author:** architect. **Scope:** server-action query
efficiency + client polling. No DB migrations required (the shared DB is PostgREST 14.4 and the main
app already added FK covering indexes).

## Context
The admin console renders cross-org list pages (projects, organizations, users, groups, integrations)
that are client components calling server actions on mount and **re-polling every 30s**. Several of
those actions issue **N+1 query fans** (one round-trip per row), so a single page load can fire
100+ Supabase queries, and the 30s poll repeats that on every open tab. The fixes below are ordered
by impact/risk. Verify each with the steps at the bottom; keep `tsc`/`build` green.

---

## P0 — Eliminate N+1 query fans (biggest win, no DB change)

### P0.1 `searchProjects` — [src/lib/actions/projects.ts](../src/lib/actions/projects.ts) (~line 56)
Today: for each project in the page it runs **4 separate `count(exact, head)` queries**
(`project_members`, `test_cases`, `test_runs`, `releases`) inside `Promise.all(data.map(async …))`.
At 25 rows that's **101 queries** per load (and per poll). Also `releaseCount` is computed but **not
displayed** on the list (`ProjectsContent.tsx` shows only member/testCase/testRun) — pure waste.

Fix: use **PostgREST embedded aggregate counts** in the single list query so counts come back in one
round-trip:
```ts
.select(
  "*, organizations(name), project_members(count), test_cases(count), test_runs(count)",
  { count: "exact" }
)
```
Then read each count from the embedded array, e.g. `row.project_members?.[0]?.count ?? 0`. Drop the
per-row queries and drop `releaseCount` from the list mapper (keep it in `getProjectById`).
- **Caveat:** the current code filters `test_cases`/`releases` by `deleted_at IS NULL`. Embedded
  `test_cases(count)` counts **all** child rows. If the soft-deleted skew matters, filter the embed
  with a referenced-table filter (`.select("…, test_cases(count)").is("test_cases.deleted_at", null)`)
  — but since the list no longer shows releaseCount and test-case soft-deletes are rare, confirm with
  a quick query whether the unfiltered count is acceptable; if not, add the embedded filter.
- Net: **101 → 1 query** per projects page load.

### P0.2 `getUserGroups` — [src/lib/actions/user-groups.ts](../src/lib/actions/user-groups.ts) (~line 44)
Same pattern: per-group `count` queries for `group_memberships` and `project_group_access` (2N+1).
Fix with embedded counts:
```ts
.select("*, group_memberships(count), project_group_access(count)")
```
Read `g.group_memberships?.[0]?.count ?? 0` etc. Net: **2N+1 → 1**.

### P0.3 Dedupe duplicate lookup in `getOrganizationById` — [organizations.ts](../src/lib/actions/organizations.ts) (~line 116/120)
`getOrgUuidFromClerkId(orgId)` (a DB query) is awaited **twice** for the same org. Compute it once
into a `const orgUuid` before the projects/usage queries and reuse it.

---

## P1 — Stop wasted re-fetching (client polling)

### P1.1 Pause polling when the tab is hidden
Six pages poll every 30s and re-run the heavy actions even when the tab is in the background:
[organizations/OrganizationsContent.tsx](../src/app/organizations/OrganizationsContent.tsx),
[projects/ProjectsContent.tsx](../src/app/projects/ProjectsContent.tsx),
[users/UsersContent.tsx](../src/app/users/UsersContent.tsx),
[builds/page.tsx](../src/app/builds/page.tsx),
[help-desk/queue/page.tsx](../src/app/help-desk/queue/page.tsx),
[help-desk/HelpDeskShell.tsx](../src/components/help-desk/HelpDeskShell.tsx).

In each `setInterval` callback, skip the fetch when `document.visibilityState !== "visible"`, and
trigger one fetch on `visibilitychange` back to visible. Keep it DRY — add a small
`useVisiblePolling(fn, intervalMs)` hook (e.g. `src/lib/hooks/use-visible-polling.ts`) and replace the
six hand-rolled `useEffect`/`setInterval` blocks with it. This cuts background query load to zero.

### P1.2 `getIntegrationMetrics` — [integrations.ts](../src/lib/actions/integrations.ts) (~line 183)
It calls `searchIntegrations({ limit: 10000 })`, which **fetches every row from all 5 integration
tables** just to compute totals. Replace with lightweight `count(exact, head)` queries per table for
the total, and derive `byType` from those counts. (Status/error breakdowns that truly need row data
can stay, but select only `status`/`error_message`, not `*`.)

---

## P2 — Reduce payload (incremental, do after P0/P1)

### P2.1 Replace `select("*")` on hot list queries with explicit columns
`select("*")` over-fetches wide rows (and embedded JSON like `config`, `metadata`). Narrow the
columns to what each mapper actually reads, starting with the highest-traffic/widest tables:
`support-tickets.ts`, `projects.ts`, `integrations.ts` (the 5 `*, organizations(name)` selects),
`builds.ts`. Leave the conflicted untyped surfaces (`announcements.ts`, `api-usage.ts`) alone.

### P2.2 `searchIntegrations` column narrowing
It fetches `*` from 5 tables on every call then merges/paginates in memory. Keep the in-memory merge
(needed for cross-table sort/paginate) but select only the columns the mapper uses, per table.

---

## Out of scope (flag, don't do here)
- DB indexes / views / aggregate RPCs — FK covering indexes already exist; a counts view would need a
  migration to the shared DB (coordinate with the main app first).
- Converting list pages to Server Components for initial paint — larger refactor; propose separately.
- The pre-existing ~60 Clerk-mock test failures and the broken `next lint` (Next 16) — unrelated.

## Verification
1. `npx tsc --noEmit` → 0 errors; `npm run build` → green.
2. **Query-count check (the point of this work):** temporarily log queries (or watch the Supabase
   dashboard logs / network tab) while loading `/projects` and `/groups` before vs after P0 — expect
   the per-page query count to drop from ~100 to a handful.
3. Spot-check the UI: projects list still shows correct member/test-case/run counts; groups list shows
   correct member/project counts; org detail unchanged.
4. P1.1: open a list page, switch tabs for >30s, confirm no fetch fires while hidden (logs/network),
   and one fetch fires on return.
5. Run the existing test suite — no **new** failures beyond the known pre-existing Clerk-mock set.
