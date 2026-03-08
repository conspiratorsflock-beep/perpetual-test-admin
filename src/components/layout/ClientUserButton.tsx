"use client";

import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";

export function ClientUserButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder with the same dimensions to prevent layout shift
    return <div className="h-7 w-7 rounded-full bg-slate-800" />;
  }

  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "h-7 w-7",
        },
      }}
    />
  );
}
