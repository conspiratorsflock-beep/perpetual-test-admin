import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

let _client: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  _client = createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}

/**
 * Service-role Supabase client — bypasses RLS.
 * Use ONLY in server-side code (Server Components, Route Handlers, Server Actions).
 * Never expose the service role key to the client.
 *
 * Lazily initialized so missing env vars don't crash the dev server at boot.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as unknown as Record<string, unknown>)[prop as string];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

/**
 * Escape hatch: the SAME service-role client, but untyped.
 *
 * Use ONLY for the handful of admin surfaces whose intended schema does not match
 * the shared DEV database because this repo's admin migrations were never applied
 * there (schema conflicts / missing tables, columns, and RPC functions). Typing
 * these against the generated schema would be wrong, so they intentionally bypass
 * it until the migration situation is resolved.
 *
 * Every call site should carry a `// DRIFT:` comment. See TODO.md
 * ("Schema drift surfaced by the typed client"). Remove usages as migrations land.
 */
export const supabaseAdminUntyped = supabaseAdmin as unknown as SupabaseClient;
