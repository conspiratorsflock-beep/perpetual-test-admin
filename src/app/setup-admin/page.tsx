"use client";

import { Suspense } from "react";
import { SetupAdminContent } from "./SetupAdminContent";

export default function SetupAdminPage() {
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
