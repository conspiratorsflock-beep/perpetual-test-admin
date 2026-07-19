import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SetupAdminContent } from "./SetupAdminContent";

function isAdminBootstrapAllowed(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_ADMIN_BOOTSTRAP === "true"
  );
}

export default function SetupAdminPage() {
  if (!isAdminBootstrapAllowed()) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      }
    >
      <SetupAdminContent />
    </Suspense>
  );
}
