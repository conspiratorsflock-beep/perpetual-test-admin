# Cleanup — Task: remove dead tier targeting from announcements (writer side)
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Not started · **Sequence:** start AFTER PLAN_26 merges

Lathe Studio has ONE plan — the tier concept (`all|basic|pro|enterprise`) is
dead product model, and the reviewer confirmed the live
`admin_announcements.tier` column is lathe-studio-owned. The lathe-studio
reader has already dropped tier (their commit `20638f49`); this plan makes
the console's WRITER stop sending/selecting it. **Sequencing contract: the
reviewer drops the DB column with a lathe-studio migration only AFTER this
plan merges** — until then the column exists and tolerates writers, so
nothing breaks mid-transition. This is a **change** task.

## Inventory (verified 2026-07-19 via PLAN_25 report — verify again)
- `src/lib/actions/announcements.ts` — `announcementTier` zod enum (:69),
  tier in selects (:35, :54), row mapping (:16), create default (:112),
  update passthrough, `logAdminAction` metadata (:132)
- `src/lib/shared/get-announcements.ts` — tier reads/filtering (:30, :59, :84)
- `src/app/support/announcements/page.tsx` + form components — tier select UI
- `src/app/support/announcements/debug/page.tsx` — tier display/diagnostics
  (:38–40, :98, :113–114)
- `src/types/` — any BannerTier/tier fields on announcement types
- Tests asserting tier behavior — update to lock the NEW contract
  (insert/update payloads must NOT contain `tier`; lathe-studio's
  get-announcements tests now do exactly this — mirror them)
- EXCLUDE: `supabase/migrations/` (column drop is the reviewer's
  lathe-studio migration, not this repo's); the `admin_announcements`
  TypeScript row type generated from the DB (regenerate/patch only if the
  reviewer's column drop has landed — otherwise leave the generated type
  alone and stop referencing the field)

## What MUST be true / asserted
1. No code path writes or selects `tier` (or `target_tiers`): grep-proven
   zero references in `src/` outside generated DB types.
2. Announcement create/edit UI has no tier control; existing announcements
   render regardless of their stored tier value.
3. Tests lock the contract: insert and update payloads
   `.not.toHaveProperty('tier')` and `.not.toHaveProperty('target_tiers')`.
4. Verify gate green: `npm run test`, `npm run typecheck`, dummy-key build.

## Branch workflow
1. Create `kimi/remove-announcement-tiers` off latest main (post-PLAN_26).
2. One commit per concern (actions, shared helper, UI, debug page, tests),
   + this plan doc. No `git add -A`.
3. Verify gate green after EVERY commit.
4. Report branch + summary. Do NOT merge.

## Guardrails
- Selecting `*` would silently re-include the column and pass tests —
  where selects are explicit today, keep them explicit minus `tier`.
- The debug page exists to diagnose banner visibility; keep it working
  with org/scheduling diagnostics, just drop the tier dimension — don't
  delete the page.
- If the generated DB row type includes `tier`, do NOT hand-edit the
  generated file; the type keeps the field until the reviewer's column
  drop + regeneration. Code simply stops referencing it.
- Stuck = leave a marker + reason + report it.

## Report back to Claude
- Branch + per-file commits; the grep proof; gate numbers; verified vs NOT
  verified. Flag explicitly when done: the reviewer then lands the
  lathe-studio `DROP COLUMN` migration + `verify:migrations-applied` and
  regenerates types in both repos as needed.
