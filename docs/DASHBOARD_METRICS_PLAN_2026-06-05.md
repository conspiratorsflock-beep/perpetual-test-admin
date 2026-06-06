# Plan — Dashboard real metrics + TODO hygiene (2026-06-05)

**Audience:** Kimi Code. **Author:** architect. **Why this scope:** I reviewed the TODO roadmap
against the actual code. Most of it is **already done** (stale TODO):
- Phase 6 (builds/releases): `builds.ts`/`releases.ts` query the real tables; no `build_queue_items`
  refs remain. ✅
- Phase 7 (reliability): 15 `error.tsx` boundaries exist; `setupEmergencyAdmin` export exists. ✅
- Phase 9 (help-desk analytics): the page is already wired to real `getSupportAnalytics` /
  `getTicketVolumeData` / `getAgentLeaderboard`. ✅

The clear remaining, self-contained, high-value item with **no blocking questions** is **Phase 10 —
Dashboard real data** (the dashboard still fabricates sparklines with `Math.random` and omits the
beta KPIs it should show). This plan does that, plus a quick TODO cleanup so the roadmap stops
misleading. Keep `tsc --noEmit` and `next build` green; no new test failures.

## Not in scope / blocked (don't attempt)
- **`admin_audit_logs` is absent** (see TODO.md drift section) → the dashboard "Recent Admin Activity"
  card **cannot** be populated and `logAdminAction()` is a no-op. Leave that card as the existing
  placeholder link to `/support/activity`; add a one-line code comment saying why. The real fix is a
  DB migration (main-app coordination), not this task.
- CSV export / Slack alerts (Phase 11) — good next candidate, but Slack needs a webhook URL; skip here.

---

## P0 — Dashboard real metrics  ·  [src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx)

### 1. Kill the fake sparklines
Remove `generateSparkData` (the `Math.random` helper, ~L30) and the per-card
`numericValue/sparkData` derivation. Replace with **real daily series** from a new server action.

Add `getDashboardTrends(days = 14)` (new action, e.g. `src/lib/actions/dashboard.ts`) returning
daily buckets for the window:
- `newUsers[]` — bucket `users.created_at` by day.
- `newOrgs[]` — bucket `organizations.created_at` by day.
- `apiCalls[]` — bucket `api_usage_logs.created_at` by day.

Implementation: one narrow query per series (`select("created_at").gte("created_at", windowStart)`),
tally into per-day counts in JS (admin/DEV volumes are small; bounded by the window). Admin-gate it
(`requireAdmin`) like the other actions, typed `supabaseAdmin`.

Wire sparklines to the real series: **Total Users → newUsers**, **Active Orgs → newOrgs**,
**API Calls Today → apiCalls**. For **MRR** there's no daily history — drop its sparkline (render
nothing) rather than fake one.

### 2. Real change % on Users / Orgs
In `getDashboardTrends` (or inline), compute signups in the last 7 days vs the prior 7 days for users
and orgs; set each card's `change` (e.g. `"+12% vs last week"`) and `trend` (up/down/neutral) from
that. (MRR + API already have real `change`.)

### 3. Add a second row of beta KPI cards
Reuse [getBillingMetrics()](../src/lib/actions/billing.ts) — it **already** returns `activeTrials`,
`paidOrgs`, `trialToPaidConversionRate`. Add cards:
- **Active Trials** ← `billingMetrics.activeTrials`
- **Paid Orgs** ← `billingMetrics.paidOrgs`
- **Trials Expiring (≤7d)** ← new lightweight count: `organizations` where
  `trial_lock_state = 'active'` AND `trial_ends_at` between now and now+7d. Add a small action
  (`getTrialsExpiringSoon()` in organizations.ts) returning the count. Make this card's value red/amber
  when > 0.
- **Open Tickets** ← count `support_tickets` where `status in ('open','in_progress','pending')`
  (new small action or reuse existing logic in support-tickets.ts).

Keep the existing 4 cards as row 1; add these 4 as row 2 under a small "Beta" subheading. Keep
`getBillingMetrics()` wrapped in `.catch(() => null)` and render `—` if null (as today).

### 4. Don't touch
The Quick Actions grid and the "Recent Admin Activity" placeholder (see blocked note above).

---

## P1 — TODO.md hygiene  ·  [TODO.md](../TODO.md)
The roadmap is stale and causing confusion. Update it:
- Mark **Phase 6**, **Phase 7**, **Phase 9** as ✅ done (with a one-line note each).
- Mark **Phase 10** done once P0 lands.
- Fix the **🐛 Known Issues** list: `setupEmergencyAdmin` now exists; `build_queue_items` is gone;
  the `admin-banner linkUrl` note is resolved. Replace with the current real known issue:
  **`admin_audit_logs` missing → admin action auditing non-functional** (cross-reference the drift section).

---

## Verification
1. `npx tsc --noEmit` → 0 errors; `npm run build` → green.
2. `grep -rn "Math.random" src/app/dashboard` → no matches.
3. Load `/dashboard`: 8 stat cards show real numbers; sparklines reflect real signup/API series (flat
   if no data, not random); MRR card has no sparkline; "Trials Expiring" highlights when > 0.
4. No new test failures beyond the known pre-existing Clerk-mock set (~61).
