"use client";

import { Suspense } from "react";
import { UsersContent } from "./UsersContent";
import { UsersLoading } from "./UsersLoading";

export default function UsersPage() {
  return (
    <Suspense fallback={<UsersLoading />}>
      <UsersContent />
    </Suspense>
  );
}
