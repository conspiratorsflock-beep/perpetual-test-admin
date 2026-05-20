import type { Metadata } from "next";
import { ClerkProvider } from "@/lib/dev-auth/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminShell } from "@/components/layout/AdminShell";
import "./globals.css";

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
          <TooltipProvider>
            <AdminShell>{children}</AdminShell>
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
