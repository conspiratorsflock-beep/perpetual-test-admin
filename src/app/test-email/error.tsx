"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TestEmailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Test Email Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <AlertCircle className="h-10 w-10 text-red-400" />
      <h2 className="text-lg font-semibold text-slate-100">Something went wrong</h2>
      <p className="text-sm text-slate-400 max-w-md text-center">
        {error.message || "Failed to load the Test Email dashboard."}
      </p>
      <Button
        onClick={reset}
        variant="outline"
        className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
      >
        Retry
      </Button>
    </div>
  );
}
