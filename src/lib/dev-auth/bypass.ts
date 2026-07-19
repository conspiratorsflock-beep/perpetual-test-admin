/**
 * Centralized dev-auth bypass evaluation.
 *
 * The bypass is a local-development convenience that fabricates an admin
 * session so engineers do not need Clerk credentials to run the console.
 * It MUST be impossible in any hosted environment.
 *
 * Rules:
 * - `isDevAuthBypassEnabled()` is true only when `NODE_ENV === "development"`
 *   AND one of the bypass flags is set to `"true"`.
 * - `assertNoBypassInProduction()` throws at startup if any bypass flag is
 *   `"true"` while `NODE_ENV === "production"`.
 *
 * All existing reads of `DEV_AUTH_BYPASS` / `NEXT_PUBLIC_DEV_AUTH_BYPASS`
 * should route through `isDevAuthBypassEnabled()`. Do not read the raw flags
 * anywhere else.
 */

export function isDevAuthBypassEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }
  return (
    process.env.DEV_AUTH_BYPASS === "true" ||
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true"
  );
}

export function assertNoBypassInProduction(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  if (
    process.env.DEV_AUTH_BYPASS === "true" ||
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true"
  ) {
    throw new Error(
      "DEV_AUTH_BYPASS and NEXT_PUBLIC_DEV_AUTH_BYPASS must not be set to 'true' in production. " +
        "The dev-auth bypass is a localhost-only mechanism. " +
        "Unset these variables before deploying the admin console."
    );
  }
}
