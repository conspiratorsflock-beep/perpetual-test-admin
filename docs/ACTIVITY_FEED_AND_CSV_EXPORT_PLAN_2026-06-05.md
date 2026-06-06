# Plan — Recent Admin Activity feed + CSV export (2026-06-05)

**Audience:** Kimi Code. **Author:** architect. Two small, self-contained features. Both reuse
existing infrastructure. Keep `tsc --noEmit` and `next build` green; no new test failures.

---

## Task A (P0) — Wire the "Recent Admin Activity" dashboard feed
Now unblocked: `admin_audit_logs` exists (migration 20260605230000) and a read action already exists —
`getAuditLogs({ limit, offset, ... })` in [src/lib/audit/logger.ts](../src/lib/audit/logger.ts)
returns `{ logs: AuditLog[]; count }`, newest-first. `AuditLog` =
`{ id, adminUserId, adminEmail, action, targetType, targetId, targetName, metadata, createdAt }`.

In [src/app/dashboard/page.tsx](../src/app/dashboard/page.tsx), replace the placeholder card (the
"View activity logs in the Support section" block + the NOTE comment above it):
- Fetch recent entries — add `getAuditLogs({ limit: 8 })` to the existing `loadStats` `Promise.all`
  (wrap in `.catch(() => ({ logs: [], count: 0 }))` so a failure never breaks the dashboard, like
  `getBillingMetrics`). Store `logs` in state.
- Render a compact list per entry: `action` (e.g. `announcement.create`), the target
  (`targetName` ?? `targetType`), `adminEmail`, and a relative timestamp from `createdAt`
  (`date-fns` is already a dependency — `formatDistanceToNow`). Keep the existing dark-mode card styling.
- **Empty state:** the table is real but will be sparse until admin actions accumulate — show
  "No recent admin activity" (don't imply it's broken). Keep a link to `/support/activity` for the
  full log.
- Remove the now-inaccurate NOTE comment.

This finishes the last open item in Phase 10.

---

## Task B (P1) — CSV export for Users and Organizations
Infrastructure already exists — **reuse it, don't reinvent**:
- [src/lib/utils/export-download.ts](../src/lib/utils/export-download.ts) → `downloadCSV(csv, filename)`
  (client helper).
- [src/lib/actions/audit-export.ts](../src/lib/actions/audit-export.ts) → `exportAuditLogsToCSV()`
  shows the server-action-returns-CSV-string pattern.

**⚠️ Scope correction:** the TODO lists `/leads`, but **there is no leads feature** in this repo
(no `sandbox_leads` table in the schema, no action, no page). **Do `/users` and `/organizations`
only**; drop `/leads`.

**⚠️ Fix the CSV escaping:** the existing `exportAuditLogsToCSV` builds rows with a naive
`r.join(",")` — that corrupts any field containing a comma, quote, or newline (org names, emails).
Add a shared helper and use it for the new exports (and ideally retrofit audit-export):
```ts
// src/lib/utils/csv.ts
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}
```

### B1. Export actions
Add to `users.ts` and `organizations.ts` (admin-gated, typed client / Clerk like their `search*` peers):
- `exportUsersToCSV(): Promise<string>` — reuse `searchUsers`, but **paginate to a cap** (Clerk
  `getUserList` is paged; loop offset in chunks of 100 up to e.g. 1000, or pass a large `limit`).
  Columns: email, name, isAdmin, orgName/orgId, createdAt (+ any cheap fields already on `AdminUser`).
- `exportOrganizationsToCSV(): Promise<string>` — reuse `searchOrganizations` similarly. Columns:
  name, slug, trialLockState, trialEndsAt, stripeSubscriptionId (or a "paid/trial" status),
  memberCount, mrr, createdAt.
Build the string with `toCsv(...)`. Keep the cap modest (Clerk rate limits) and note it in a comment.

### B2. Export buttons
Add an "Export CSV" button to [UsersContent.tsx](../src/app/users/UsersContent.tsx) and
[OrganizationsContent.tsx](../src/app/organizations/OrganizationsContent.tsx) (near the search bar).
On click: call the export action, then `downloadCSV(csv, "users-YYYY-MM-DD.csv")`. Disable + show a
spinner while exporting; catch errors into a toast/console (don't crash the page).

### Out of scope (needs your input)
- The **Slack alerts** half of Phase 11 (`SLACK_WEBHOOK_URL`, `notifySlack`, trial-lock/ticket alerts)
  — needs a webhook URL from you. Skip here.
- A combined "Beta Report" multi-entity export — optional; can follow once single-entity CSV lands.

---

## Verification
1. `npx tsc --noEmit` → 0 errors; `npm run build` → green.
2. Dashboard: "Recent Admin Activity" renders real entries when present (trigger one admin action,
   e.g. create an announcement, then reload) and a clean empty state otherwise.
3. `/users` and `/organizations`: "Export CSV" downloads a well-formed file; open it and confirm a row
   with a comma in the name/email is correctly quoted (escaping works).
4. No new test failures beyond the pre-existing Clerk-mock set (~61).
