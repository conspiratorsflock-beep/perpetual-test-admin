import { describe, it, expect } from "vitest";
import { assertSafeDbTestEnv } from "./database/guard";

describe("Database test guard", () => {
  it("throws when RUN_DB_TESTS is unset", () => {
    expect(() =>
      assertSafeDbTestEnv({
        RUN_DB_TESTS: undefined,
        SUPABASE_TEST_URL: "http://127.0.0.1:54321",
      })
    ).toThrow(/Database integration tests are disabled/);
  });

  it("throws when RUN_DB_TESTS is not '1'", () => {
    expect(() =>
      assertSafeDbTestEnv({
        RUN_DB_TESTS: "yes",
        SUPABASE_TEST_URL: "http://127.0.0.1:54321",
      })
    ).toThrow(/Database integration tests are disabled/);
  });

  it("throws when SUPABASE_TEST_URL is missing", () => {
    expect(() =>
      assertSafeDbTestEnv({
        RUN_DB_TESTS: "1",
        SUPABASE_TEST_URL: undefined,
      })
    ).toThrow(/Database integration tests require SUPABASE_TEST_URL/);
  });

  it("throws for the shared dev project URL", () => {
    expect(() =>
      assertSafeDbTestEnv({
        RUN_DB_TESTS: "1",
        SUPABASE_TEST_URL: "https://zonsnvcwtfotqzrvozqs.supabase.co",
      })
    ).toThrow(/refused: SUPABASE_TEST_URL points to a remote host/);
  });

  it("throws for any remote host", () => {
    expect(() =>
      assertSafeDbTestEnv({
        RUN_DB_TESTS: "1",
        SUPABASE_TEST_URL: "https://example.supabase.co",
      })
    ).toThrow(/refused: SUPABASE_TEST_URL points to a remote host/);
  });

  it("throws for an invalid URL", () => {
    expect(() =>
      assertSafeDbTestEnv({
        RUN_DB_TESTS: "1",
        SUPABASE_TEST_URL: "not-a-url",
      })
    ).toThrow(/not a valid URL/);
  });

  it("passes for localhost", () => {
    expect(() =>
      assertSafeDbTestEnv({
        RUN_DB_TESTS: "1",
        SUPABASE_TEST_URL: "http://localhost:54321",
      })
    ).not.toThrow();
  });

  it("passes for 127.0.0.1", () => {
    expect(() =>
      assertSafeDbTestEnv({
        RUN_DB_TESTS: "1",
        SUPABASE_TEST_URL: "http://127.0.0.1:54321",
      })
    ).not.toThrow();
  });
});
