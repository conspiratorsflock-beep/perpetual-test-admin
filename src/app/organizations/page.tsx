"use client";

import { Suspense } from "react";
import { OrganizationsContent } from "./OrganizationsContent";
import { OrganizationsLoading } from "./OrganizationsLoading";

export default function OrganizationsPage() {
  return (
    <Suspense fallback={<OrganizationsLoading />}>
      <OrganizationsContent />
    </Suspense>
  );
}
