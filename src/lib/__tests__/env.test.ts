import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

function setNodeEnv(value: string): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe("env validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  async function loadEnv() {
    const mod = await import("../env");
    return mod.env;
  }

  it("does not require production variables in development", async () => {
    setNodeEnv("development");
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_ENV_LABEL;

    const env = await loadEnv();
    expect(env.NODE_ENV).toBe("development");
  });

  it("does not require production variables in test", async () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_ENV_LABEL;

    const env = await loadEnv();
    expect(env.NODE_ENV).toBe("test");
  });

  it("throws when production variables are missing", async () => {
    setNodeEnv("production");
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_ENV_LABEL;

    await expect(loadEnv()).rejects.toThrow();
  });

  it("throws when bypass flags are true in production", async () => {
    setNodeEnv("production");
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_...";
    process.env.CLERK_SECRET_KEY = "sk_test_...";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "key";
    process.env.NEXT_PUBLIC_ENV_LABEL = "STAGING";
    process.env.DEV_AUTH_BYPASS = "true";

    await expect(loadEnv()).rejects.toThrow(
      "DEV_AUTH_BYPASS and NEXT_PUBLIC_DEV_AUTH_BYPASS must not be 'true' in production"
    );
  });

  it("throws when NEXT_PUBLIC_DEV_AUTH_BYPASS is true in production", async () => {
    setNodeEnv("production");
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_...";
    process.env.CLERK_SECRET_KEY = "sk_test_...";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "key";
    process.env.NEXT_PUBLIC_ENV_LABEL = "STAGING";
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS = "true";

    await expect(loadEnv()).rejects.toThrow(
      "DEV_AUTH_BYPASS and NEXT_PUBLIC_DEV_AUTH_BYPASS must not be 'true' in production"
    );
  });

  it("parses production env when valid", async () => {
    setNodeEnv("production");
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_...";
    process.env.CLERK_SECRET_KEY = "sk_test_...";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "key";
    process.env.NEXT_PUBLIC_ENV_LABEL = "STAGING";

    const env = await loadEnv();
    expect(env.NODE_ENV).toBe("production");
    expect(env.NEXT_PUBLIC_ENV_LABEL).toBe("STAGING");
  });
});
