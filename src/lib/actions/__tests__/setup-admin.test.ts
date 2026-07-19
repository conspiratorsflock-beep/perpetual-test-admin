import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import { clerkClient } from "@clerk/nextjs/server";
import { logAdminAction } from "@/lib/audit/logger";

function setNodeEnv(value: string): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

vi.mock("@/lib/clerk/admin-check", () => ({
  isCurrentUserAdmin: vi.fn(() => Promise.resolve(false)),
  requireAdmin: vi.fn(async () => {}),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

vi.mock("@/lib/audit/logger", () => ({
  logAdminAction: vi.fn(() => Promise.resolve()),
}));

const mockIsCurrentUserAdmin = vi.mocked(isCurrentUserAdmin);
const mockClerkClient = vi.mocked(clerkClient);
const mockLogAdminAction = vi.mocked(logAdminAction);

function makeClerkUser(id: string, email: string, isAdmin = false) {
  return {
    id,
    emailAddresses: [{ emailAddress: email }],
    firstName: null,
    lastName: null,
    publicMetadata: { isAdmin },
  };
}

function makeClient(users: unknown[]) {
  return {
    users: {
      getUserList: vi.fn(() => Promise.resolve({ data: users })),
      updateUserMetadata: vi.fn(() => Promise.resolve()),
    },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>;
}

async function loadSetupAdmin() {
  vi.resetModules();
  const mod = await import("../setup-admin");
  return mod as {
    promoteUserToAdminByEmail: (email: string) => Promise<{ success: boolean; message: string }>;
    setupEmergencyAdmin: (secret: string) => Promise<{ success: boolean; message: string }>;
  };
}

describe("setup-admin — promoteUserToAdminByEmail", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SETUP_ADMIN_SECRET;
    delete process.env.ALLOW_ADMIN_BOOTSTRAP;
    setNodeEnv("test");
  });

  afterEach(() => {
    setNodeEnv(originalNodeEnv ?? "test");
  });

  it("returns bootstrap-disabled in production without ALLOW_ADMIN_BOOTSTRAP", async () => {
    setNodeEnv("production");
    const { promoteUserToAdminByEmail } = await loadSetupAdmin();

    const result = await promoteUserToAdminByEmail("a@example.com");
    expect(result).toEqual({ success: false, message: "Admin bootstrap is disabled in production" });
    expect(mockClerkClient).not.toHaveBeenCalled();
    expect(mockIsCurrentUserAdmin).not.toHaveBeenCalled();
  });

  it("allows promotion in production when ALLOW_ADMIN_BOOTSTRAP is true", async () => {
    setNodeEnv("production");
    process.env.ALLOW_ADMIN_BOOTSTRAP = "true";
    mockIsCurrentUserAdmin.mockResolvedValue(true);
    const client = makeClient([makeClerkUser("u1", "user@example.com", false)]);
    mockClerkClient.mockResolvedValue(client);
    const { promoteUserToAdminByEmail } = await loadSetupAdmin();

    const result = await promoteUserToAdminByEmail("user@example.com");
    expect(result.success).toBe(true);
    expect(client.users.updateUserMetadata).toHaveBeenCalledWith("u1", { publicMetadata: { isAdmin: true } });
  });

  it("returns Unauthorized when caller is not admin", async () => {
    mockIsCurrentUserAdmin.mockResolvedValue(false);
    const { promoteUserToAdminByEmail } = await loadSetupAdmin();
    const result = await promoteUserToAdminByEmail("a@example.com");
    expect(result).toEqual({ success: false, message: "Unauthorized" });
    expect(mockClerkClient).not.toHaveBeenCalled();
  });

  it("returns not found when user does not exist", async () => {
    mockIsCurrentUserAdmin.mockResolvedValue(true);
    mockClerkClient.mockResolvedValue(makeClient([]));
    const { promoteUserToAdminByEmail } = await loadSetupAdmin();

    const result = await promoteUserToAdminByEmail("missing@example.com");
    expect(result).toEqual({ success: false, message: "User with email missing@example.com not found" });
  });

  it("returns already-admin without calling update", async () => {
    mockIsCurrentUserAdmin.mockResolvedValue(true);
    mockClerkClient.mockResolvedValue(makeClient([makeClerkUser("u1", "admin@example.com", true)]));
    const { promoteUserToAdminByEmail } = await loadSetupAdmin();

    const result = await promoteUserToAdminByEmail("admin@example.com");
    expect(result).toEqual({ success: true, message: "User admin@example.com is already an admin" });
    const client = await mockClerkClient.mock.results[0].value;
    expect(client.users.updateUserMetadata).not.toHaveBeenCalled();
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("promotes user, updates metadata, and logs the action", async () => {
    mockIsCurrentUserAdmin.mockResolvedValue(true);
    const client = makeClient([makeClerkUser("u1", "user@example.com", false)]);
    mockClerkClient.mockResolvedValue(client);
    const { promoteUserToAdminByEmail } = await loadSetupAdmin();

    const result = await promoteUserToAdminByEmail("user@example.com");
    expect(result).toEqual({ success: true, message: "Successfully promoted user@example.com to admin" });
    expect(client.users.updateUserMetadata).toHaveBeenCalledWith("u1", { publicMetadata: { isAdmin: true } });
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "user.promote_admin",
      targetType: "user",
      targetId: "u1",
      targetName: "user@example.com",
      metadata: { source: "setup-admin" },
    });
  });

  it("returns failure message on Clerk exception", async () => {
    mockIsCurrentUserAdmin.mockResolvedValue(true);
    mockClerkClient.mockRejectedValue(new Error("Clerk down"));
    const { promoteUserToAdminByEmail } = await loadSetupAdmin();

    const result = await promoteUserToAdminByEmail("user@example.com");
    expect(result).toEqual({ success: false, message: "Failed to promote user" });
  });

  it("rejects invalid email before any Clerk call", async () => {
    mockIsCurrentUserAdmin.mockResolvedValue(true);
    const { promoteUserToAdminByEmail } = await loadSetupAdmin();

    await expect(promoteUserToAdminByEmail("")).rejects.toThrow("Invalid input");
    await expect(promoteUserToAdminByEmail("not-an-email")).rejects.toThrow("Invalid input");
    expect(mockClerkClient).not.toHaveBeenCalled();
  });
});

describe("setup-admin — setupEmergencyAdmin", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SETUP_ADMIN_SECRET;
    delete process.env.SETUP_ADMIN_EMAIL;
    delete process.env.ALLOW_ADMIN_BOOTSTRAP;
    setNodeEnv("test");
  });

  afterEach(() => {
    setNodeEnv(originalNodeEnv ?? "test");
  });

  it("returns bootstrap-disabled in production without ALLOW_ADMIN_BOOTSTRAP", async () => {
    setNodeEnv("production");
    const { setupEmergencyAdmin } = await loadSetupAdmin();

    const result = await setupEmergencyAdmin("any");
    expect(result).toEqual({ success: false, message: "Admin bootstrap is disabled in production" });
    expect(mockClerkClient).not.toHaveBeenCalled();
  });

  it("returns not configured when SETUP_ADMIN_SECRET is unset", async () => {
    const { setupEmergencyAdmin } = await loadSetupAdmin();
    const result = await setupEmergencyAdmin("any");
    expect(result).toEqual({ success: false, message: "SETUP_ADMIN_SECRET is not configured on the server" });
    expect(mockClerkClient).not.toHaveBeenCalled();
  });

  it("returns invalid secret when secret does not match", async () => {
    process.env.SETUP_ADMIN_SECRET = "secret-a";
    process.env.SETUP_ADMIN_EMAIL = "admin@example.com";
    const { setupEmergencyAdmin } = await loadSetupAdmin();

    const result = await setupEmergencyAdmin("secret-b");
    expect(result).toEqual({ success: false, message: "Invalid setup secret" });
    expect(mockClerkClient).not.toHaveBeenCalled();
  });

  it("returns not configured when SETUP_ADMIN_EMAIL is unset", async () => {
    process.env.SETUP_ADMIN_SECRET = "secret-a";
    const { setupEmergencyAdmin } = await loadSetupAdmin();

    const result = await setupEmergencyAdmin("secret-a");
    expect(result).toEqual({ success: false, message: "SETUP_ADMIN_EMAIL is not configured on the server" });
    expect(mockClerkClient).not.toHaveBeenCalled();
  });

  it("promotes the configured emergency email when secret matches and logs the action", async () => {
    process.env.SETUP_ADMIN_SECRET = "secret-a";
    process.env.SETUP_ADMIN_EMAIL = "admin@example.com";
    const client = makeClient([makeClerkUser("u99", "admin@example.com", false)]);
    mockClerkClient.mockResolvedValue(client);
    const { setupEmergencyAdmin } = await loadSetupAdmin();

    const result = await setupEmergencyAdmin("secret-a");
    expect(result).toEqual({ success: true, message: "Successfully promoted admin@example.com to admin" });
    expect(client.users.updateUserMetadata).toHaveBeenCalledWith("u99", { publicMetadata: { isAdmin: true } });
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "user.promote_admin",
      targetType: "user",
      targetId: "u99",
      targetName: "admin@example.com",
      metadata: { source: "setup-admin" },
    });
  });

  it("rejects invalid secret before any Clerk call", async () => {
    process.env.SETUP_ADMIN_SECRET = "secret-a";
    process.env.SETUP_ADMIN_EMAIL = "admin@example.com";
    const { setupEmergencyAdmin } = await loadSetupAdmin();

    await expect(setupEmergencyAdmin("")).rejects.toThrow("Invalid input");
    expect(mockClerkClient).not.toHaveBeenCalled();
  });
});
