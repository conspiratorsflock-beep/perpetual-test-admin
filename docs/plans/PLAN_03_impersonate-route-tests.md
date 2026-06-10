# Test-suite repair round — Task 3: Rewrite /api/impersonate route tests for body-token contract + auth coverage
**Owner:** Kimi (execute on a branch → report) · **Reviewer:** Claude
**Status:** Not started · **Sequence:** start AFTER Plan 02 merges

The route deliberately moved the token from the URL query string to the POST
body so tokens don't land in request logs (`src/app/api/impersonate/route.ts`,
header comment). The tests still send `?token=...` with no body, so every
request short-circuits at "Invalid request body" (400). Rewrite the stale
tests to the current contract and ADD the missing auth-gate cases. The route
source is **confirm-and-lock**: it must NOT change.

Read `delegation-kit/KIMI_FEEDBACK.md` before starting.

**IMPORTANT — base branch:** `feat/typed-supabase-client-and-perf` after
Plan 02 merges.

## Inventory (verified 2026-06-10 — verify again, then work through)
- `src/app/api/impersonate/__tests__/route.test.ts` (5 failing of 7).
  Current route contract (read `route.ts:13-51`):
  - no/unparseable JSON body → 400 `"Invalid request body"`
  - body without `token` → 400 `"Missing token"`
  - unauthenticated (`userId` null) → 401 `"Not authenticated"`
  - authenticated non-admin → 403 `"Not authorized"`
  - invalid / expired / already-used token → 401 with the validator's error
  - valid → 200 `{ success, targetUserId, adminId }`
  The last two tests ("calls validateImpersonationToken with correct token",
  "handles URL-encoded tokens") already POST a JSON body and pass — use them
  as the template.
- Auth comes from `@/lib/dev-auth/server` (`route.ts:1`), which the shared
  setup currently satisfies via the `@clerk/nextjs/server` mock (admin).
  There are NO tests for the 401/403 auth gates — add them (see sketch).
- EXCLUDE: `src/lib/actions/__tests__/impersonation.test.ts` — passes; it
  covers the validator itself. Do not touch it or `delegation-kit/`.

## What MUST be true / asserted
- File: 0 failed. `route.ts` zero-line diff.
- Every distinct outcome asserted as a distinct (status, error) pair — exactly
  the table above; never merge the 400 cases with the 401s ("we couldn't
  parse" ≠ "you're not allowed").
- Auth-gate tests must prove auth is checked BEFORE token validation:
  in the 401/403 cases assert `validateImpersonationToken` was NOT called.
- Suite after this plan: **0 failed** (first fully-green suite of the round —
  record the exact passed/skipped counts; expected ≈ 182 passed / 47 skipped
  + your new tests). Typecheck: 0 errors.
- Test count = baseline + exactly your new auth tests; state the delta.

## Branch workflow
1. Branch `kimi/impersonate-route-tests` off latest
   `feat/typed-supabase-client-and-perf`.
2. Commits: one for the stale-test rewrite, one for the new auth-gate tests,
   + this plan doc. No `git add -A`.
3. Gate after every commit: `npm run test`, `npm run typecheck`.
4. Report. Do NOT merge.

## Pre-solved sketch (starting point — NOT verified; get it right against the real module)
The shared setup mock pins `auth()` to a fixed admin. To vary it per-test,
mock the wrapper the route actually imports:

```ts
const mockAuth = vi.fn();
vi.mock("@/lib/dev-auth/server", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

beforeEach(() => {
  mockAuth.mockResolvedValue({
    userId: "admin_1",
    sessionClaims: { publicMetadata: { isAdmin: true } },
  });
});

// non-admin case:
mockAuth.mockResolvedValue({
  userId: "user_1",
  sessionClaims: { publicMetadata: { isAdmin: false } },
});
// unauthenticated case:
mockAuth.mockResolvedValue({ userId: null, sessionClaims: null });
```

Check `src/lib/dev-auth/server.ts` for what else it exports — if the route
file (or anything it imports) uses other exports, the mock factory must
provide them.

## Guardrails
- The body-parse failure and missing-token failure are distinct route
  branches — test both (`new NextRequest(url)` with no body vs `POST` with
  `{}`).
- `sessionClaims.publicMetadata.isAdmin` is the exact path the route reads —
  don't restructure the claim shape in mocks; a "passing" test with the wrong
  claim shape would prove nothing (this is the route's security gate).
- Error strings (`"Not authenticated"`, `"Not authorized"`, `"Missing
  token"`, `"Invalid request body"`) are wire values consumed by the main
  app's middleware — assert them byte-exact; never adjust them in source.
- Stuck = report; never weaken an assertion.

## Report back to Claude
- Branch + commits; gate numbers (this plan should produce the first
  fully-green suite — flag loudly if not); findings beyond the spec;
  **verified vs NOT verified** (e.g. "the main app's middleware consumes
  these exact error strings — NOT verifiable from this repo; reviewer checks
  against lathe-studio"). Update `docs/plans/kimi-running-log.md`.
