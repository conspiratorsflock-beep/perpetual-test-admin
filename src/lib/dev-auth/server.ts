import type { auth as RealAuth, currentUser as RealCurrentUser } from "@clerk/nextjs/server";

type AuthReturn = Awaited<ReturnType<typeof RealAuth>>;
type UserReturn = Awaited<ReturnType<typeof RealCurrentUser>>;

const DEV_BYPASS = process.env.DEV_AUTH_BYPASS === "true" || process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";

const mockAuth: AuthReturn = {
  userId: "dev_admin",
  sessionId: "dev_session",
  orgId: null,
  orgRole: null,
  orgSlug: null,
  sessionClaims: {
    metadata: { isAdmin: true },
  } as unknown as AuthReturn["sessionClaims"],
  actor: undefined,
  has: () => true,
  getToken: async () => "dev_token",
  redirectToSignIn: () => new Response(null, { status: 307 }),
};

const mockUser: UserReturn = {
  id: "dev_admin",
  emailAddresses: [{ emailAddress: "admin@localhost", id: "email_1", verification: null }] as unknown as UserReturn["emailAddresses"],
  primaryEmailAddress: { emailAddress: "admin@localhost", id: "email_1", verification: null } as unknown as UserReturn["primaryEmailAddress"],
  firstName: "Dev",
  lastName: "Admin",
  fullName: "Dev Admin",
  imageUrl: "",
  publicMetadata: { isAdmin: true },
} as UserReturn;

export async function auth(): Promise<AuthReturn> {
  if (!DEV_BYPASS) {
    const { auth: realAuth } = await import("@clerk/nextjs/server");
    return realAuth();
  }
  return mockAuth;
}

export async function currentUser(): Promise<UserReturn> {
  if (!DEV_BYPASS) {
    const { currentUser: realCurrentUser } = await import("@clerk/nextjs/server");
    return realCurrentUser();
  }
  return mockUser;
}
