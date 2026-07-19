import type { Metadata } from "next";
import { ClerkProvider } from "@/lib/dev-auth/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminShell } from "@/components/layout/AdminShell";
import { EnvironmentBanner } from "@/components/layout/EnvironmentBanner";
import { assertNoBypassInProduction } from "@/lib/dev-auth/bypass";
import "@/lib/env";
import "./globals.css";

assertNoBypassInProduction();

export const metadata: Metadata = {
  title: "Lathe Studio — Admin Console",
  description: "Internal admin console for Lathe Studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="antialiased">
          <EnvironmentBanner />
          <TooltipProvider>
            <AdminShell>{children}</AdminShell>
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
