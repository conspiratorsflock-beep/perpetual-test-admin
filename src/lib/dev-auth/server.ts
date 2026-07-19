import { auth as authReal, currentUser as currentUserReal } from "@clerk/nextjs/server";
import type { auth as RealAuth, currentUser as RealCurrentUser } from "@clerk/nextjs/server";
import { isDevAuthBypassEnabled } from "./bypass";

type AuthReturn = Awaited<ReturnType<typeof RealAuth>>;
type UserReturn = Awaited<ReturnType<typeof RealCurrentUser>>;
type UserObj = NonNullable<UserReturn>;

const mockAuth = {
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
} as unknown as AuthReturn;

const mockUser: UserObj = {
  id: "dev_admin",
  emailAddresses: [{ emailAddress: "admin@localhost", id: "email_1", verification: null }] as unknown as UserObj["emailAddresses"],
  primaryEmailAddress: { emailAddress: "admin@localhost", id: "email_1", verification: null } as unknown as UserObj["primaryEmailAddress"],
  firstName: "Dev",
  lastName: "Admin",
  fullName: "Dev Admin",
  imageUrl: "",
  publicMetadata: { isAdmin: true },
} as unknown as UserObj;

export async function auth(): Promise<AuthReturn> {
  if (!isDevAuthBypassEnabled()) {
    return authReal();
  }
  return mockAuth;
}

export async function currentUser(): Promise<UserReturn> {
  if (!isDevAuthBypassEnabled()) {
    return currentUserReal();
  }
  return mockUser;
}
