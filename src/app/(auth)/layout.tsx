export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth pages don't use AdminShell - they render without the sidebar.
  // EnvironmentBanner comes from the root layout (this layout nests inside
  // it) — rendering it here too stacks a duplicate.
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950">
      {children}
    </div>
  );
}
