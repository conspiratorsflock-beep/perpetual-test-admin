"use client";

import { Suspense } from "react";
import { ProjectsContent } from "./ProjectsContent";

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <h1 className="text-xl font-semibold text-slate-100">Projects</h1>
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      }
    >
      <ProjectsContent />
    </Suspense>
  );
}
