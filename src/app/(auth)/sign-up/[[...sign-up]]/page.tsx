import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="space-y-4 text-center">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-100">
          Perpetual Test{" "}
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-medium text-amber-400">
            Admin
          </span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">Create an admin account</p>
      </div>
      <SignUp
        fallbackRedirectUrl="/dashboard"
        signInFallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
