import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isDevAuthBypassEnabled,
  assertNoBypassInProduction,
} from "../bypass";

function setNodeEnv(value: string): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe("dev-auth bypass", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.DEV_AUTH_BYPASS;
    delete process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("isDevAuthBypassEnabled", () => {
    it("returns false when NODE_ENV is production even if flag is true", () => {
      setNodeEnv("production");
      process.env.DEV_AUTH_BYPASS = "true";
      expect(isDevAuthBypassEnabled()).toBe(false);
    });

    it("returns false when NODE_ENV is test even if flag is true", () => {
      setNodeEnv("test");
      process.env.DEV_AUTH_BYPASS = "true";
      expect(isDevAuthBypassEnabled()).toBe(false);
    });

    it("returns true in development when DEV_AUTH_BYPASS is true", () => {
      setNodeEnv("development");
      process.env.DEV_AUTH_BYPASS = "true";
      expect(isDevAuthBypassEnabled()).toBe(true);
    });

    it("returns true in development when NEXT_PUBLIC_DEV_AUTH_BYPASS is true", () => {
      setNodeEnv("development");
      process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS = "true";
      expect(isDevAuthBypassEnabled()).toBe(true);
    });

    it("returns false in development when no bypass flag is set", () => {
      setNodeEnv("development");
      expect(isDevAuthBypassEnabled()).toBe(false);
    });

    it("returns false when flag is set to a value other than true", () => {
      setNodeEnv("development");
      process.env.DEV_AUTH_BYPASS = "1";
      process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS = "yes";
      expect(isDevAuthBypassEnabled()).toBe(false);
    });
  });

  describe("assertNoBypassInProduction", () => {
    it("throws when DEV_AUTH_BYPASS is true in production", () => {
      setNodeEnv("production");
      process.env.DEV_AUTH_BYPASS = "true";
      expect(() => assertNoBypassInProduction()).toThrow(
        "DEV_AUTH_BYPASS and NEXT_PUBLIC_DEV_AUTH_BYPASS must not be set to 'true' in production"
      );
    });

    it("throws when NEXT_PUBLIC_DEV_AUTH_BYPASS is true in production", () => {
      setNodeEnv("production");
      process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS = "true";
      expect(() => assertNoBypassInProduction()).toThrow(
        "DEV_AUTH_BYPASS and NEXT_PUBLIC_DEV_AUTH_BYPASS must not be set to 'true' in production"
      );
    });

    it("does not throw in production when bypass flags are absent", () => {
      setNodeEnv("production");
      delete process.env.DEV_AUTH_BYPASS;
      delete process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS;
      expect(() => assertNoBypassInProduction()).not.toThrow();
    });

    it("does not throw in development with bypass enabled", () => {
      setNodeEnv("development");
      process.env.DEV_AUTH_BYPASS = "true";
      expect(() => assertNoBypassInProduction()).not.toThrow();
    });

    it("does not throw in test with bypass enabled", () => {
      setNodeEnv("test");
      process.env.DEV_AUTH_BYPASS = "true";
      expect(() => assertNoBypassInProduction()).not.toThrow();
    });
  });
});
