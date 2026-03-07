import { redirect } from "next/navigation";

/**
 * Support page - redirects to activity log as the default support section
 */
export default function SupportPage() {
  redirect("/support/activity");
}
