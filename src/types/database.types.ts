// Source of truth for the typed Supabase client (`supabaseAdmin`).
//
// As of the 20260605230000_add_admin_console_tables migration, every table the admin
// code queries now exists in the database, so the generated types are complete and no
// hand-written augmentation is needed. `Database` is re-exported directly from the
// generated file. Regenerate with: npx supabase gen types typescript --linked
export type { Database, Json } from "./database.generated";
