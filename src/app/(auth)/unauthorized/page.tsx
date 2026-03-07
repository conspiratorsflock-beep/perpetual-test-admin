import Link from "next/link";
import { ShieldX } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center">
      <ShieldX className="h-12 w-12 text-slate-600" />
      <h1 className="mt-4 text-xl font-semibold text-slate-100">
        Access Denied
      </h1>
      <p className="mt-2 max-w-sm text-center text-sm text-slate-400">
        You don&apos;t have admin permissions. Contact your administrator to
        request access.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="https://perpetualtest.com"
          className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
        >
          Back to App
        </Link>
        <SignOutButton>
          <button className="rounded-md bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20">
            Sign Out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
