import { describe, it } from "vitest";

/**
 * SKIPPED WITH REASON — Database integration tests for api-usage.
 *
 * The current source (`src/lib/actions/api-usage.ts`) reads from
 * `api_usage_logs`, but that table is not defined in any migration under
 * `supabase/migrations/`. The old `api_usage_daily` table and the
 * `increment_api_calls` / `get_api_calls_for_range` RPCs still exist in
 * migrations, but the action code no longer uses them.
 *
 * Until `api_usage_logs` is added to the local migration set, these tests
 * cannot run against `supabase db reset` and are skipped entirely.
 */
describe.skip("Database: API Usage (Integration) — skipped: api_usage_logs table missing from migrations", () => {
  it("placeholder", () => {
    // This block is skipped so the file remains a valid Vitest test module.
  });
});
