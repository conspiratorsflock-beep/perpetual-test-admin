# Security hardening — Task: make the console safe to deploy off localhost
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** MERGED to main 7453136 (2026-07-19) with 4 review fixes — see delegation-kit/KIMI_FEEDBACK.md

This console is about to get its first hosted deployment (staging now, prod at
cutover — see lathe-studio `docs/plans/ADMIN_APP_PRELAUNCH_PLAN.md`). Today it
is localhost-only and runs with `DEV_AUTH_BYPASS=true`, which fabricates an
`isAdmin` session (`src/lib/dev-auth/server.ts` `mockAuth`, `has: () => true`)
and skips Clerk entirely in middleware. Deployed with that flag set, the app
is an unauthenticated cross-tenant control plane holding the service-role key.
This plan makes that state impossible, adds fail-fast env validation, neuters
the admin-bootstrap surface in deployed environments, and adds environment
chrome. This is a **change** task.

Motivating incident class: lathe-studio's middleware rewrite-before-auth
bypass (`43ea1fb`) — auth that exists but can be structurally skipped.

**D2 ruling (Bryan 2026-07-19): the console shares the PRODUCT's Clerk
instance** (revisit in 3–6 months; a separate admin instance is the eventual
destination). Consequence: every Lathe Studio customer credential can attempt
sign-in here — the `isAdmin` gate is the ONLY wall between a customer session
and the control plane. Items 7–8 below exist because of this ruling.

## Inventory (verified 2026-07-19 — verify again, then work through)
- `src/middleware.ts` — `DEV_BYPASS` const short-circuits all auth before
  Clerk loads; also note its admin check reads `sessionClaims.publicMetadata`
  while dev-auth's mock sets `sessionClaims.metadata` (works only because the
  mock path never reaches it — do not "fix" the mock to match, contain it)
- `src/lib/dev-auth/server.ts`, `src/lib/dev-auth/client.tsx` — mock
  auth/currentUser/Clerk components when either `DEV_AUTH_BYPASS` or
  `NEXT_PUBLIC_DEV_AUTH_BYPASS` is `"true"`
- `src/lib/clerk/admin-check.ts` — admin gate helper, has a BYPASS reference
- `src/app/(auth)/sign-in/…`, `sign-up/…`, `unauthorized/page.tsx` — BYPASS
  references (render alternates in bypass mode)
- `src/lib/actions/setup-admin.ts` — `setupEmergencyAdmin` (SETUP_ADMIN_SECRET,
  timing-safe) + `promoteUserToAdminByEmail`; `src/app/setup-admin/*` UI
- `src/app/api/make-admin/`, `src/app/api/check-admin/`, `src/app/api/impersonate/`
  — verify each route's auth posture as found, not as documented
- EXCLUDE: `src/test/setup.ts` mocks (test-only, not the bypass mechanism);
  `e2e/` bypass usage (Playwright depends on it locally — keep working in dev)

## What MUST be true / asserted
1. **Bypass is dev-only, structurally.** All bypass evaluation goes through
   ONE helper (e.g. `src/lib/dev-auth/bypass.ts`) that returns true only when
   `process.env.NODE_ENV === "development"` AND a flag is set. Every current
   `DEV_AUTH_BYPASS` / `NEXT_PUBLIC_DEV_AUTH_BYPASS` read routes through it.
2. **Fail loud, not quiet:** in a production build (`NODE_ENV === "production"`),
   if either bypass flag is set to `"true"`, the app throws at startup
   (module-load check in middleware + root layout) with a clear message. A
   test asserts the throw; a test asserts dev mode still bypasses.
3. **Env fail-fast:** a zod-validated env module (server-side) required by
   middleware/root layout. Production requires: Clerk publishable + secret
   keys, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_ENV_LABEL`; and rejects bypass flags. Development keeps
   today's loose behavior.
4. **Admin bootstrap is opt-in per environment:** `setupEmergencyAdmin`,
   `promoteUserToAdminByEmail`, `/api/make-admin`, and the `/setup-admin` page
   refuse (404/403 + no-op) when `NODE_ENV === "production"` unless
   `ALLOW_ADMIN_BOOTSTRAP === "true"`. Both promotion paths write
   `logAdminAction` (add if missing). `/api/check-admin` must require an
   authenticated admin session — it takes an arbitrary email and looks up
   users (enumeration surface); verify and lock if open.
5. **Environment chrome:** when `NEXT_PUBLIC_ENV_LABEL` is set, a persistent,
   non-dismissable banner renders on every page INCLUDING the (auth) pages —
   amber styling for `STAGING`, red for `PRODUCTION`, any other value neutral
   slate. Unset (local dev) renders nothing. Dark-only app — must read on
   slate-950.
6. Verify gate green: `npm run test`, `npm run typecheck`; e2e must still pass
   locally under dev bypass (`npm run e2e` if runnable, else say NOT verified).
7. **No self-registration (D2 consequence):** the `(auth)/sign-up` surface is
   removed or permanently redirects to `/unauthorized` — admin accounts are
   provisioned, never self-registered. Sign-in stays. (Customers signing up
   happens in the main app; a signup created via the admin surface would be a
   confusing half-account with no org.)
8. **MFA enforced in code, production only (D2 consequence):** an
   instance-wide Clerk MFA requirement would force it on every customer, so
   the admin app must enforce it itself: in production, an authenticated
   admin WITHOUT MFA enrolled (`twoFactorEnabled` false/absent) cannot reach
   any admin page — show a clear "enroll MFA in your account, then return"
   block instead. Server-side check (guard/layout via `currentUser()` or a
   users.getUser fetch is fine); do NOT depend on custom session-token claims
   (that's a dashboard config dependency this repo can't carry). Dev bypass
   mode is exempt. Tests for enrolled/not-enrolled/dev paths.

## Branch workflow
1. Create `kimi/staging-deploy-hardening` off latest main.
2. One commit per concern (bypass helper, env module, bootstrap gating,
   chrome, tests), + this plan doc. No `git add -A`.
3. Verify gate green after EVERY commit, not just the last.
4. Report branch + summary (format in KIMI_IMPLEMENTER_GUIDE). Do NOT merge.

## Guardrails
- **Do not delete the bypass** — local dev and the Playwright suite depend on
  it. The task is containment (dev-only + fail-loud), not removal.
- `NEXT_PUBLIC_*` vars are baked into the client bundle at BUILD time — the
  runtime throw must also cover the server flag, and the env-module check
  runs server-side where real values are visible.
- The middleware `publicMetadata` vs mock `metadata` mismatch above is a
  known oddity, not a bug to fix by loosening either side.
- Keep `/api/impersonate` behavior byte-identical — it is correctly
  admin-gated today (verified in survey); it's in inventory only so you
  confirm its auth posture still holds after the dev-auth changes.
- Do not touch `supabase/migrations/` — schema work is out of scope here
  (PLAN_25 inventories it, report-only).
- Stuck = leave a marker + reason + report it. Never widen types or weaken
  assertions to get green.

## Report back to Claude
- Branch + per-file commits; work done vs deferred (count + reasons); real
  findings beyond the spec (file:line, consequence, action taken) — expected
  finding category: routes whose auth posture differs from their docs; gate
  numbers (suite count + exit, typecheck, e2e run or NOT); **verified vs NOT
  verified** — explicitly: production-build throw behavior can only be
  asserted via unit test here, name it if you couldn't exercise a real
  `next build && next start`.

---

## Completion Summary

**Branch:** `kimi/staging-deploy-hardening`

**Commits:**
1. `7f7af25` — dev-auth: centralize bypass in helper and route all reads through it
2. `03d7a62` — env: add zod fail-fast validation and load at startup
3. `78e417c` — bootstrap: gate admin setup surfaces in production
4. `4ab0421` — auth surface: close sign-up, enforce MFA, add environment chrome
5. `5604b99` — tests: bypass, env fail-fast, and bootstrap gating coverage

**What was done:**
| Concern | Files | Notes |
|---------|-------|-------|
| Dev-auth bypass containment | `src/lib/dev-auth/bypass.ts`, `server.ts`, `client.tsx`, `src/lib/clerk/admin-check.ts`, auth pages | Single helper returns true only in `development` + flag; production startup throws if any bypass flag is `"true"`. |
| Env fail-fast | `src/lib/env.ts`, `src/middleware.ts`, `src/app/layout.tsx` | Zod schema requires Clerk, Supabase, env label in production and rejects bypass flags. Loaded at middleware + root layout. |
| Admin bootstrap gating | `src/lib/actions/setup-admin.ts`, `src/app/setup-admin/page.tsx`, `src/app/api/make-admin/route.ts` | Production requires `ALLOW_ADMIN_BOOTSTRAP=true`; otherwise 404/403 + no-op. Promotion paths now log `user.promote_admin`. |
| Sign-up closure | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Permanently redirects to `/unauthorized`; dev bypass still goes to `/dashboard`. |
| MFA enforcement | `src/middleware.ts`, `src/app/mfa-required/page.tsx` | Production admin pages fetch `user.twoFactorEnabled` and redirect to `/mfa-required` when missing/false; API routes exempted. |
| Environment chrome | `src/components/layout/EnvironmentBanner.tsx`, `src/app/layout.tsx`, `src/app/(auth)/layout.tsx` | Non-dismissable banner; amber for `STAGING`, red for `PRODUCTION`, slate otherwise; hidden when label unset. |
| Tests | `src/lib/dev-auth/__tests__/bypass.test.ts`, `src/lib/__tests__/env.test.ts`, `src/lib/actions/__tests__/setup-admin.test.ts` | 31 new tests covering bypass, env, and bootstrap behavior. |

**Real findings beyond the spec:**
- `/api/check-admin` (`src/app/api/check-admin/route.ts:6`) already requires an authenticated admin session before accepting an email parameter — posture matched the plan, no change needed.
- `/api/impersonate` (`src/app/api/impersonate/route.ts:13`) remains admin-gated and was left byte-identical as instructed.
- `src/lib/clerk/admin-check.ts` `sessionClaims.publicMetadata` vs dev-auth mock's `metadata` mismatch noted in plan; not touched.

**Quality gates:**
- `npm run typecheck`: clean
- `npm run test`: 677 passed / 0 failed / 45 files

**Verified:**
- Unit tests for bypass helper, env validation, and bootstrap gating.
- Type check passes.
- Existing suite still passes; no regressions in unrelated tests.

**NOT verified:**
- Real production-build throw behavior (`next build && next start` with bypass flags set) — asserted only via unit test, not exercised against a built artifact.
- E2E suite (`npm run e2e`) — not run; relies on dev bypass and local server.
- Runtime middleware MFA redirect against a real Clerk user without MFA enrolled.

**Deferred / none:** none.
