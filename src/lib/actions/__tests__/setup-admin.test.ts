import { describe, it, expect, vi, beforeEach } from "vitest";
import { isCurrentUserAdmin } from "@/lib/clerk/admin-check";
import { clerkClient } from "@clerk/nextjs/server";

vi.mock("@/lib/clerk/admin-check", () => ({
  isCurrentUserAdmin: vi.fn(() => Promise.resolve(false)),
  requireAdmin: vi.fn(async () => {}),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

const mockIsCurrentUserAdmin = vi.mocked(isCurrentUserAdmin);
const mockClerkClient = vi.mocked(clerkClient);

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
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SETUP_ADMIN_SECRET;
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
  });

  it("promotes user and updates metadata when not admin", async () => {
    mockIsCurrentUserAdmin.mockResolvedValue(true);
    const client = makeClient([makeClerkUser("u1", "user@example.com", false)]);
    mockClerkClient.mockResolvedValue(client);
    const { promoteUserToAdminByEmail } = await loadSetupAdmin();

    const result = await promoteUserToAdminByEmail("user@example.com");
    expect(result).toEqual({ success: true, message: "Successfully promoted user@example.com to admin" });
    expect(client.users.updateUserMetadata).toHaveBeenCalledWith("u1", { publicMetadata: { isAdmin: true } });
  });

  it("returns failure message on Clerk exception", async () => {
    mockIsCurrentUserAdmin.mockResolvedValue(true);
    mockClerkClient.mockRejectedValue(new Error("Clerk down"));
    const { promoteUserToAdminByEmail } = await loadSetupAdmin();

    const result = await promoteUserToAdminByEmail("user@example.com");
    expect(result).toEqual({ success: false, message: "Failed to promote user" });
  });
});

describe("setup-admin — setupEmergencyAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SETUP_ADMIN_SECRET;
  });

  it("returns not configured when SETUP_ADMIN_SECRET is unset", async () => {
    const { setupEmergencyAdmin } = await loadSetupAdmin();
    const result = await setupEmergencyAdmin("any");
    expect(result).toEqual({ success: false, message: "SETUP_ADMIN_SECRET is not configured on the server" });
    expect(mockClerkClient).not.toHaveBeenCalled();
  });

  it("returns invalid secret when secret does not match", async () => {
    process.env.SETUP_ADMIN_SECRET = "secret-a";
    const { setupEmergencyAdmin } = await loadSetupAdmin();

    const result = await setupEmergencyAdmin("secret-b");
    expect(result).toEqual({ success: false, message: "Invalid setup secret" });
    expect(mockClerkClient).not.toHaveBeenCalled();
  });

  it("promotes the hardcoded emergency email when secret matches", async () => {
    process.env.SETUP_ADMIN_SECRET = "secret-a";
    const client = makeClient([makeClerkUser("u99", "butteredpeanuts@gmail.com", false)]);
    mockClerkClient.mockResolvedValue(client);
    const { setupEmergencyAdmin } = await loadSetupAdmin();

    const result = await setupEmergencyAdmin("secret-a");
    expect(result).toEqual({ success: true, message: "Successfully promoted butteredpeanuts@gmail.com to admin" });
    expect(client.users.updateUserMetadata).toHaveBeenCalledWith("u99", { publicMetadata: { isAdmin: true } });
  });
});
