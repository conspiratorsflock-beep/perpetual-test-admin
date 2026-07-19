import { redirect } from "next/navigation";
import { isDevAuthBypassEnabled } from "@/lib/dev-auth/bypass";

export default function SignUpPage() {
  if (isDevAuthBypassEnabled()) {
    redirect("/dashboard");
  }

  // Admin accounts are provisioned, never self-registered.
  // The signup surface is closed in all hosted environments.
  redirect("/unauthorized");
}
