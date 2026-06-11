import { assertSafeDbTestEnv } from "./guard";

/**
 * Database-integration test setup.
 *
 * This runs before any test file imports `@/lib/supabase/admin`, so we map the
 * test-specific env vars onto the names the admin client reads.
 *
 * The global `src/test/setup.ts` is intentionally NOT loaded for the DB config,
 * so the real Supabase client is used and no mocks are installed.
 */
if (process.env.SUPABASE_TEST_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_TEST_URL;
}
if (process.env.SUPABASE_TEST_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
}

assertSafeDbTestEnv(process.env);
