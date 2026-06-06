# Plan — Internal Test Email Dashboard (2026-06-05)

**Audience:** Kimi Code. **Author:** architect. **Source:** the Test Email Dashboard brief from the
app team. **Goal:** an internal admin dashboard to monitor the app's Test Email feature, reading three
**app-owned** tables, plus inbox-management write controls.

## Decisions locked (with the user)
- **Build read-only dashboard + inbox-management write controls** (force-expire, delete mailbox).
- **NO access to email content.** The admin must be able to *manage mailboxes* but must **never** see
  message subject, sender, or body. Surface message **counts / received-times / read-status only**.
  Enforce this at the type level (see §1) so content columns can't even be selected.
- "Block user" / "adjust caps" controls from the brief are **deferred** — there's no backing table for
  them in the brief's schema (see §4).

## Critical context
- The three tables (`test_email_mailboxes`, `test_email_messages`, `test_email_events`) are **owned by
  the app repo and do NOT exist in our DB yet** (confirmed absent from `docs/Schema.md`). **Do not
  create or migrate them here.** Until the app ships them, every query fails — so the dashboard must be
  **failure-safe** and show an "awaiting provisioning" state (§3).
- Standard admin conventions apply (already how this repo works): `service_role` via `supabaseAdmin`,
  Clerk admin gate (`isCurrentUserAdmin`/`requireAdmin`), server actions in `src/lib/actions/`, client
  pages calling them, dark-mode shadcn/ui, `logAdminAction()` on writes (now functional — the
  `admin_audit_logs` table exists). Keep `tsc --noEmit` and `next build` green.

---

## 0. Domain Management panel (READY NOW — table already exists)
Unlike the rest of this plan (which waits on app-owned tables), this is fully buildable today:
the **admin-owned** `test_email_domains` table was created via migration `20260605233000` and is
already in the generated types — **no augmentation needed**, just use the typed `supabaseAdmin`.

Table columns: `id, domain (unique), is_active, notes, created_by, created_at, updated_at,
deactivated_at, deactivated_by`.

**What it is / isn't:** a registry/allowlist the admin manages. DNS/MX + provider inbound routes are
set up **manually/externally by the team** (confirmed) — adding a row here does NOT provision mail.
**Coordination flag:** the app's inbound pipeline must READ this table (generate addresses only on
`is_active` domains; accept inbound only for them) for the list to take effect.

Actions in `src/lib/actions/test-email-domains.ts` (admin-gated, typed `supabaseAdmin`, `logAdminAction`
on every write with `targetType: "system"`, `targetName: <domain>`, domain in metadata):
- `listTestEmailDomains()` → all rows, active first then deactivated (order by `is_active desc,
  domain`).
- `addTestEmailDomain(domain, notes?)` → normalize (trim, lowercase), validate domain format
  (regex, reject protocols/paths/spaces), rely on the UNIQUE constraint for dupes (surface a friendly
  "already exists" — note a re-add of a deactivated domain should **reactivate** it, not error).
- `deactivateTestEmailDomain(id)` → soft-delete: `is_active=false, deactivated_at=now(),
  deactivated_by=<admin>`. **Never hard-delete.**
- `reactivateTestEmailDomain(id)` → `is_active=true, deactivated_at=null, deactivated_by=null`.

**Deactivate semantics (decided):** stop-new-only — flipping `is_active=false` must NOT expire existing
mailboxes; the app keeps them alive until TTL. The admin table only records active/inactive; surface
this in the confirm copy ("New test emails can't be created on this domain; existing inboxes keep
working until they expire.").

UI — a "Domains" section/tab in the Test Email Dashboard:
- **Add domain** form (input + validate + add).
- **Active domains** list, each with a **Deactivate** button → **"Are you sure?" confirm dialog** (use
  the repo's existing confirm/AlertDialog pattern) explaining the stop-new-only effect.
- **Deactivated domains** list (kept visible) with a one-click **Reactivate** button — this is the
  safeguard against accidentally interrupting customers.
- Dark-mode shadcn/ui; show `created_by`/`deactivated_at` for context.

Domain type (camelCase) in `src/types/admin.ts`: `TestEmailDomain`. Action-level tests for
add/deactivate/reactivate (mock `supabaseAdmin`, assert `logAdminAction`).

---

## 1. Type the three upstream tables (augmentation, content-omitted)
The generated types don't include these tables. Re-introduce a small, clearly-marked augmentation in
[src/types/database.types.ts](../src/types/database.types.ts) — same pattern previously used, but for
**upstream-owned, not-yet-created** tables. Header note: *"Best-effort types for app-owned
`test_email_*` tables (brief 2026-06-05); regenerate and delete this once they land in the DB."*

Types (best-effort from the brief; refine when upstream publishes exact column types/nullability):
- `test_email_mailboxes`: `id, local_part, address, user_id, organization_id, label, created_at,
  expires_at, extended`.
- `test_email_events`: `id, event_type, mailbox_id, local_part, provider_message_id, detail (Json),
  created_at`. (No PII — safe to surface freely.)
- `test_email_messages`: **type ONLY the non-content columns** — `id, mailbox_id, received_at, read`.
  **Deliberately omit** `subject, from_address, from_name, body_text, body_html` so the typed client
  makes selecting them a compile error. This is the enforcement mechanism for "no email content."

`Database` = generated ∩ these three (mirror the old augmentation merge shape).

---

## 2. Read dashboard
New page [src/app/test-email/page.tsx] (client) + section components, fed by a new
`src/lib/actions/test-email.ts` (all `requireAdmin()` + typed `supabaseAdmin`, each read wrapped so a
missing-table error degrades to empty, not a crash). Add a nav entry in
[AdminSidebar.tsx](../src/components/layout/AdminSidebar.tsx) and an `error.tsx` for the route.

Panels (map 1:1 to the brief, minus content):
1. **Overview metrics** — active mailboxes (count where `expires_at > now()`); created 24h/7d
   (`test_email_mailboxes.created_at`); messages received 24h/7d (`test_email_messages.received_at`
   count); avg messages/mailbox; count of users at/near the 25-active cap.
2. **Abuse signals** — top users by active-mailbox count and by 24h creation volume; users at/over cap
   (≥25 active) or near it (≥20). Implementation: select non-content columns
   (`user_id, created_at, expires_at`) over the window and tally per user in JS (bounded; internal
   tool). Note the cost in a comment.
3. **Mailbox explorer** — search by `address` / `local_part` / `user_id`. Show mailbox metadata
   (owner, org, created, expires, extended) and, for the selected mailbox, **message-volume only**:
   total count, unread count (`read = false`), last `received_at`. **No message list with
   subject/sender/body** — those columns aren't even typed.
4. **Inbound health** — from `test_email_events`: counts by `event_type` (`ingest_ok`,
   `signature_failed`, `domain_rejected`, `mailbox_not_found`, `mailbox_expired`, `duplicate`) over a
   rolling window (events prune at 30d). Tally in JS or per-type counts.
5. **Cleanup health** — latest `cleanup_run` event (`order by created_at desc limit 1`) →
   `detail.mailboxes_purged` / `detail.events_pruned`; plus expired-but-unpurged backlog =
   `test_email_mailboxes` where `expires_at < now()`.
6. **Config status** — inbound domain / provider / MX: informational, sourced from env (e.g.
   `NEXT_PUBLIC_TEST_EMAIL_DOMAIN`) or shown as "configured upstream." Low priority; static is fine.

Efficiency: prefer `count: "exact", head: true` for simple counts; reserve the fetch-and-tally-in-JS
approach for the per-user/per-event-type aggregations PostgREST can't group. (Apply the perf lessons —
no per-row query fans.)

---

## 3. Failure-safe / not-yet-provisioned
Because the tables don't exist yet: add a cheap probe (like `system-health.ts` does — `select("id")
.limit(1)` on `test_email_mailboxes`, catch error). If it errors, render a single "Test Email tables
not yet provisioned by the app" banner instead of broken panels. Every read action returns safe empties
on error so the page never white-screens.

---

## 4. Inbox-management write controls (audit-logged, behind confirms)
In `test-email.ts`, add admin-gated mutations on the app-owned `test_email_mailboxes`:
- `forceExpireMailbox(id)` → `update({ expires_at: now })` (the app's cleanup cron then purges it).
- `deleteMailbox(id)` → `delete()` the row.
Each: confirm dialog in the UI, then `logAdminAction(...)`. **Audit target_type gotcha:**
`admin_audit_logs.target_type` has a CHECK constraint that does **not** include `test_email`. Use an
allowed value — `targetType: "user"` with the mailbox owner's `user_id` as `targetId` and the mailbox
`address`/`id` in `metadata`. (Do not invent a new target_type — it would violate the CHECK; extending
it is a separate owned migration if ever wanted.)

**Deferred (no backing schema in the brief — needs app-repo support, flag, don't build):**
- **Block user from generating** — no block-list table exists.
- **Adjust caps** — the 25-cap is app config, not a per-user/admin-writable table.
Note these in the page as "managed in the app" / future, and in TODO.md.

---

## 5. Types, tests, hygiene
- Domain types (camelCase) in [src/types/admin.ts](../src/types/admin.ts): `TestEmailMailbox`,
  `TestEmailEvent`, and small aggregate shapes (overview, abuse rows, health). No message-content type.
- Tests: action-level with a mocked `supabaseAdmin` (follow the `announcements.test.ts` mock pattern).
  Cover: overview counts, abuse tally, cleanup-health parsing, and that mutations call
  `logAdminAction`. (Repo's component tests are Clerk-mock-brittle; keep to action tests.)
- Add a short entry to TODO.md describing the dashboard + the two deferred controls + the
  "regenerate types & drop augmentation when upstream tables land" follow-up.

## Verification
1. `npx tsc --noEmit` → 0; `npm run build` → green.
2. Attempting to select a content column (e.g. `.select("subject")` on `test_email_messages`) is a
   **type error** — confirms the no-content guardrail.
3. With tables absent (current state): the page shows "not yet provisioned," no crash.
4. `grep -rn "body_text\|body_html\|from_address\|subject" src/lib/actions/test-email.ts src/app/test-email`
   → no matches (no content access anywhere).
5. Write controls call `logAdminAction` (verify in `admin_audit_logs`); confirm dialogs present.
6. No new test failures beyond the pre-existing Clerk-mock set (~61).

## Out of scope / needs app-repo coordination
- Creating/migrating the `test_email_*` tables (owned upstream).
- Block-user and cap-adjustment controls (no backing schema).
- Any surfacing of message subject/sender/body (explicitly excluded by decision).
