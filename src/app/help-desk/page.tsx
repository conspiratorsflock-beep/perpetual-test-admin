import { Suspense } from "react";
import { Metadata } from "next";
import { HelpDeskShell } from "@/components/help-desk/HelpDeskShell";
import { HelpDeskLoading } from "@/components/help-desk/HelpDeskLoading";

export const metadata: Metadata = {
  title: "Help Desk | Admin Console",
  description: "Manage support tickets and customer inquiries",
};

export default function HelpDeskPage() {
  return (
    <Suspense fallback={<HelpDeskLoading />}>
      <HelpDeskShell />
    </Suspense>
  );
}
