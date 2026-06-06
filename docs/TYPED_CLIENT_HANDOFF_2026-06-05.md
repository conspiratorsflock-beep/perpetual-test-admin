# Handoff — Typed Supabase client transition (2026-06-05)

**What:** Made `supabaseAdmin` fully typed so `npx tsc --noEmit` and `next build` are green
(they were red: 787 `never`-type errors from the untyped client, and `next.config.ts` has no
`ignoreBuildErrors`). Author: architect agent. Audience: whoever picks this up next.

## Result
- `npx tsc --noEmit` → **0 errors** (was 787).
- `npm run build` → **green** (exit 0, all 39 routes generated).
- Test suite: ~60 **pre-existing** failures remain (Clerk provider not mocked in jsdom — unrelated
  to types). One regression I introduced (announcements test mock) was fixed; a defensive
  `getSupportTicketLinks` mock was added to the TicketDetail test.
- `npm run lint` is broken independently of this work (Next.js 16 removed `next lint`).

## How it works
1. `src/types/database.generated.ts` — generated from the shared DEV project
   (`zonsnvcwtfotqzrvozqs`). Regenerate with `npx supabase gen types typescript --linked`. Do not hand-edit.
2. `src/types/database.types.ts` — exports the `Database` type used by the client. It merges the
   generated `Database` with a hand-written augmentation for **8 admin-only tables that don't exist
   in the DEV DB** (their migrations were never applied). Keep the augmentation in sync with the
   migration SQL noted in the file header.
3. `src/lib/supabase/admin.ts` — `supabaseAdmin` is now `SupabaseClient<Database>`. It also exports
   `supabaseAdminUntyped`, a documented escape-hatch (same service-role client, untyped) for a few
   surfaces whose intended schema conflicts with the DEV DB.

## The important context: schema drift
Typing surfaced real drift because **this repo's admin migrations were never applied to the shared
DEV DB**. Full details + the decision log are in **[TODO.md](../TODO.md) → "Schema drift surfaced by
the typed Supabase client"**. Summary:
- **8 admin tables missing in DEV** (system_settings, feature_flags, system_health_checks,
  admin_audit_logs, admin_error_logs, impersonation_tokens, api_usage_daily,
  support_ticket_seeding_log) → type-augmented so code compiles; **features will fail at runtime**
  until the migrations are applied. (User decision: documented, not fixed.)
- **4 surfaces isolated** behind `supabaseAdminUntyped`, each tagged `// DRIFT:` — announcements,
  api-usage, canned-response `increment`, agent `is_agent_on_duty`. These have genuine
  shape/RPC conflicts with the DEV DB.
- **Clean fixes** applied elsewhere: `project_members.role` → derived from `custom_roles(name)`;
  `org_api_usage` real columns; `is_feature_enabled`/`get_latest_health_status` RPCs → direct
  queries; pervasive nullable-column coalescing in mappers.

## Next steps to consider
- To make the 8 missing-table features actually work: apply this repo's admin migrations to the DB
  (`supabase/migrations/2026031*`, `20260601`, `20260615`, …), then regenerate types and drop the
  matching augmentation entries. **Warning:** it's a shared DB the main app also uses — coordinate.
- Reconcile the `admin_announcements` and `api_usage_daily` conflicts, then remove those
  `supabaseAdminUntyped` call sites.
- The test suite needs a Clerk-provider test harness fix (separate effort).
