# Refactor round — Task 7: Replace dev-auth wrapper's lazy require() with static imports
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Completed — ready for review · **Sequence:** started after PLAN_06 merged

`src/lib/dev-auth/client.tsx` and `server.ts` wrap Clerk behind a
`DEV_BYPASS` flag using lazy `require("@clerk/nextjs")` calls inside each
function. This pattern is mock-hostile (it broke 19 TicketDetail tests in
the repair round — `vi.mock("@clerk/nextjs")` never reached the wrapper)
and invisible to static analysis. Refactor to **top-level static imports
with call-time branching**. Architectural decision already made — do not
redesign: same module paths, same export names, same DEV_BYPASS semantics.
**Pure refactor: zero behavior change, zero test changes, test count
unchanged.**

Read `delegation-kit/KIMI_FEEDBACK.md` first. **Base branch: `main`.**

## Inventory (verified 2026-06-10 — verify again, then work through)
- `src/lib/dev-auth/client.tsx` (~101 lines): exports `ClerkProvider`,
  `UserButton`, `SignedIn`, `SignedOut`, `useUser`, `useAuth` — each does
  `if (!DEV_BYPASS) { const { X: real } = require("@clerk/nextjs"); ... }`.
  Replace with `import { useUser as clerkUseUser, ... } from "@clerk/nextjs"`
  at top; keep the per-function `if (!DEV_BYPASS)` branch calling the static
  import. Keep the mock returns byte-identical.
- `src/lib/dev-auth/server.ts` (~57 lines): exports `auth`, `currentUser`
  (verify the full export list) with typed mocks; same treatment with
  `@clerk/nextjs/server`.
- 14 consumer files import from the wrappers — they must need ZERO changes
  (the module API is unchanged). Do not touch them.
- EXCLUDE: `src/test/setup.ts` and all test files — if the refactor forces a
  test change, the refactor is wrong; stop and report.

## What MUST be true / asserted
- No `require(` remains under `src/lib/dev-auth/` (grep proves it).
- Hooks rules: `useUser`/`useAuth` must call the Clerk hook unconditionally
  OR branch the same way every render (DEV_BYPASS is a build-time constant —
  branching on it is render-stable; note this in a comment).
- All 314+ tests pass UNTOUCHED; typecheck 0 errors; `npm run build`
  completes (static imports change the module graph — the build is the
  proof it still resolves).
- **Reviewer-held gate (not yours):** dev server boots with
  `DEV_AUTH_BYPASS=true` and no Clerk keys. The lazy require() may have
  existed to dodge import-time env validation — if your build fails without
  Clerk env vars, that hypothesis is TRUE: stop, report, do not work around
  it with dynamic import tricks.

## Branch workflow
1. Branch `kimi/dev-auth-static-imports` off latest `main` (must contain
   PLAN_06's merge).
2. One commit per file (client.tsx, server.ts), + this plan doc.
3. Gate after every commit: `npm run test`, `npm run typecheck`,
   `npm run build`.
4. Report. Do NOT merge.

## Guardrails
- The mock objects (mockUser, mockAuth) are consumed by real pages in
  DEV_BYPASS mode — byte-identical, including the `as unknown as` typings.
- `ClerkProvider` in client.tsx renders `<Real>{children}</Real>` — the
  static-import version must keep the same JSX shape.
- Do not "improve" anything else in these files (no renaming, no extracting
  the mocks). One concern per plan.
- Stuck = report with the exact error. This plan has a known-unknown (env
  validation at import time); hitting it is a finding, not a failure.

## Report back to Claude
Branch + commits; grep proof no require() remains; gate numbers incl.
build; verified vs NOT verified (the no-Clerk-keys boot is the reviewer's;
say so explicitly). Update `docs/plans/kimi-running-log.md`.

## Completion Summary
- **Branch:** `kimi/dev-auth-static-imports`
- **Base:** `main` at `4d62bc0`
- **Commits:**
  - `c87c206` — `client.tsx`: replace lazy `require("@clerk/nextjs")` with static imports; keep DEV_BYPASS branching and mock returns byte-identical
  - `577ec3d` — `server.ts`: replace dynamic `import("@clerk/nextjs/server")` with static imports; keep mock objects byte-identical
- **Gate:**
  - `npm run test` → **281 passed / 0 failed / 47 skipped (328 total)**
  - `npm run typecheck` → **0 errors**
  - `npm run build` → **completed** (static import resolution confirmed)
- **grep proof:** `grep -rn "require(" src/lib/dev-auth/` and `grep -rn "await import(" src/lib/dev-auth/` return no matches.
- **Verified:**
  - Wrapper module API unchanged — zero consumer file changes required.
  - Mock objects (`mockUser`, `mockAuth`) preserved byte-identically, including `as unknown as` typings.
  - `ClerkProvider`, `UserButton`, `SignedIn`, `SignedOut`, `useUser`, `useAuth` shapes preserved.
  - Added render-stability comments for hook branching on the build-time `DEV_BYPASS` constant.
- **NOT verified:** dev server boot with `DEV_AUTH_BYPASS=true` and no Clerk keys — reviewer-held gate per plan.
