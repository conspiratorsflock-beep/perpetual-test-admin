import { EnvironmentBanner } from "@/components/layout/EnvironmentBanner";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth pages don't use AdminShell - they render without the sidebar
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950">
      <EnvironmentBanner />
      {children}
    </div>
  );
}
