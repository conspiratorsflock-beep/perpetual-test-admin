/**
 * Safety interlock for database integration tests.
 *
 * Only allows DB tests to run when:
 *  - RUN_DB_TESTS === "1"
 *  - the Supabase URL host is localhost or 127.0.0.1
 *
 * Any remote host — including the shared dev project — must be rejected.
 */
export function assertSafeDbTestEnv(env: Record<string, string | undefined>): void {
  if (env.RUN_DB_TESTS !== "1") {
    throw new Error(
      "Database integration tests are disabled.\n" +
        "To run them locally:\n" +
        "  1. Start a local Supabase stack:  npx supabase start\n" +
        "  2. Copy the local API URL and service role key from the output above.\n" +
        "  3. Set SUPABASE_TEST_URL and SUPABASE_TEST_SERVICE_ROLE_KEY in your environment.\n" +
        "  4. Enable the test gate:            RUN_DB_TESTS=1 npm run test:db\n" +
        "  5. Stop the local stack when done:  npx supabase stop"
    );
  }

  const url = env.SUPABASE_TEST_URL;
  if (!url) {
    throw new Error(
      "Database integration tests require SUPABASE_TEST_URL.\n" +
        "Set it to the local Supabase API URL from `npx supabase start`."
    );
  }

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`SUPABASE_TEST_URL is not a valid URL: ${url}`);
  }

  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(
      `Database integration tests refused: SUPABASE_TEST_URL points to a remote host (${host}).\n` +
        "These tests may only run against a local Supabase stack to protect shared / production data.\n" +
        "Set SUPABASE_TEST_URL to http://localhost:54321 (or 127.0.0.1) from `npx supabase start`."
    );
  }
}
