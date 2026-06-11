# Testing Guide

This document reflects the current testing setup for the Lathe Studio Admin Console. If a claim here conflicts with the repo, the repo wins.

## Quick verify gate

```bash
npm run test        # ~40 test files, ~570 passed, 0 skipped (DB tests are excluded)
npm run typecheck   # tsc --noEmit
npm run test:db     # separate DB integration suite (local Supabase only)
```

There is **no lint step**: Next 16 dropped `next lint` and ESLint is not configured (no `.eslintrc*`, no `eslint.config.*`, no `lint` script in `package.json`).

## Test structure

```
src/
  lib/actions/__tests__/          # Server action unit tests
  lib/audit/__tests__/             # Audit logging tests
  lib/shared/__tests__/            # Shared utility tests
  components/**/__tests__/         # Component tests
  app/api/impersonate/__tests__/   # API route tests
  test/
    setup.ts                       # Shared Vitest mocks for the main suite
    database/                      # DB integration tests (run only via `test:db`)
    database-guard.test.ts         # Unit tests for the DB-test safety interlock
e2e/                               # Playwright E2E tests
```

## Shared mocks (`src/test/setup.ts`)

The global setup file provides baseline mocks so individual tests only override what matters:

- **Clerk** — admin-by-default auth (`user_test_123` with `isAdmin: true`).
- **Supabase** — a chainable mock that covers `.eq()`, `.in()`, `.maybeSingle()`, `.order()`, `.range()`, etc. Local per-file mocks replace `supabaseAdmin.from` when the default chain is insufficient.
- **Browser APIs** — `matchMedia`, `IntersectionObserver`, `ResizeObserver`, `navigator.clipboard`.

Override shared mocks per file as needed:

```typescript
const mockSupabaseFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));
```

## House style for server-action tests

Use `src/lib/actions/__tests__/impersonation.test.ts` or `organizations.test.ts` as templates:

- **Per-table mock routing** — `mockSupabaseFrom` returns a different chain for `"organizations"`, `"projects"`, `"api_keys"`, etc., when a single action touches multiple tables.
- **Non-admin gates** — assert the function throws `"Unauthorized"` and that no DB/Stripe call was made.
- **Byte-exact wire values** — assert column names and payload shapes (`deleted_at`, `revoked_at`, `monthly_quota_override`, etc.), not just "update was called".
- **Audit logging** — every write asserts `logAdminAction` with the exact action string from the source; reads assert it is not called.
- **Dates** — use `vi.setSystemTime` and pinned dates when the source calls `new Date().toISOString()`.

## The dev-auth trap

Components do not import `@clerk/nextjs` directly; they import through the wrapper at `@/lib/dev-auth/client` or `@/lib/dev-auth/server`. In tests, mock the wrapper — not Clerk itself. See `src/components/help-desk/__tests__/TicketDetail.test.tsx`:

```typescript
vi.mock("@/lib/dev-auth/client", () => ({
  useUser: () => ({ ... }),
}));
```

Mocking `@clerk/nextjs` in these tests will silently fail because the component never imports it.

## Database integration tests (`npm run test:db`)

The DB suite lives in `src/test/database/` and is **excluded from the main verify gate**. It is only runnable via `npm run test:db` against a **local Supabase stack**.

### Why local-only?

The shared dev project (`zonsnvcwtfotqzrvozqs`) holds prod-ish lathe-studio data. Running write tests there would destroy real records. The main Vitest setup also globally mocks `@/lib/supabase/admin`, so these tests could never hit a real database under the old config even if unskipped.

### How to run

```bash
# 1. Start the local stack
npx supabase start

# 2. Copy the local API URL and service role key from the output.
# 3. Export them with the test-gate env names:
export SUPABASE_TEST_URL=http://localhost:54321
export SUPABASE_TEST_SERVICE_ROLE_KEY=eyJ...
export RUN_DB_TESTS=1

# 4. Run the DB suite
npm run test:db

# 5. Stop the stack when done
npx supabase stop
```

The safety interlock in `src/test/database/guard.ts` refuses to run unless `RUN_DB_TESTS === "1"` **and** `SUPABASE_TEST_URL` resolves to `localhost` or `127.0.0.1`. Any remote URL — including the shared dev project — is rejected.

### Skipped DB tests

Some DB tests are deliberately skipped when the table they target is missing from `supabase/migrations/`:

- `api-usage.test.ts` — skipped because the current code reads `api_usage_logs`, which is not created by any local migration (the old `api_usage_daily` table and RPCs remain but are no longer used by the actions).

The remaining DB files (`audit-logs`, `feature-flags`, `impersonation`, `support-tickets`) target tables that exist in the local migration set and are unskipped.

## E2E tests (Playwright)

Commands from `package.json`:

```bash
npm run e2e         # playwright test
npm run e2e:ui      # playwright test --ui
npm run e2e:debug   # playwright test --debug
```

Prerequisites:

```bash
npx playwright install
```

The dev server is expected on port `3001` (see `playwright.config.ts` and `package.json`). If you already have a dev server running, use:

```bash
npx playwright test --reuse-existing-server
```

## Writing new tests

1. Re-run `npm run test` and `npm run typecheck` after every commit.
2. If a shared mock is wrong for your case, override it locally; do not edit `src/test/setup.ts` unless the baseline is genuinely broken.
3. Keep the source file under test unchanged unless the plan explicitly authorizes edits. Suspected bugs are reported and locked by tests, not silently fixed.
