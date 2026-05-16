"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}

export function ErrorFallback({ error, reset, title = "Something went wrong" }: ErrorFallbackProps) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <p className="text-sm text-slate-400">
            {error.message || "An unexpected error occurred while loading this page."}
          </p>
          {error.digest && (
            <p className="text-xs text-slate-600 font-mono">Error ID: {error.digest}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={reset}
            variant="outline"
            className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Link href="/dashboard">
            <Button
              variant="outline"
              className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
            >
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
