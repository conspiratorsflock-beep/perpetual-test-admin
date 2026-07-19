import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import { isDevAuthBypassEnabled } from "@/lib/dev-auth/bypass";

export default function MfaRequiredPage() {
  // Bypass mode never enforces MFA and mounts no ClerkProvider — rendering
  // SignOutButton there would crash. Mirror the sign-up page's dev behavior.
  if (isDevAuthBypassEnabled()) {
    redirect("/dashboard");
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <ShieldAlert className="h-12 w-12 text-amber-500" />
        <h1 className="mt-4 text-xl font-semibold text-slate-100">
          Multi-Factor Authentication Required
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Admin access to this console requires MFA. Enroll multi-factor
          authentication in your Clerk account, then return and sign in again.
        </p>
        <div className="mt-6 flex gap-3">
          <SignOutButton>
            <button className="rounded-md bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20">
              Sign Out and Return
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
