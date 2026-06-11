-- Security advisor lint 0011 (function_search_path_mutable): pin the
-- trigger function's search_path. It only calls pg_catalog.NOW(), so an
-- empty path is safe and removes the schema-shadowing attack surface.
-- Applied to the live DB via MCP on 2026-06-11 (user-approved); this file
-- keeps the local chain in sync.
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
