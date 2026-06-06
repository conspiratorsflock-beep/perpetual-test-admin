// Source of truth for the typed Supabase client (`supabaseAdmin`).
//
// `database.generated.ts` is generated from the shared DEV project and is missing
// 8 admin-console-only tables whose migrations were never applied to that DB
// (see TODO.md "Admin tables missing from DEV DB"). We merge those tables in here
// so the typed client covers every table the admin code queries.
//
// Each admin table below is hand-derived from its migration SQL:
//   - feature_flags, system_health_checks, admin_audit_logs, admin_error_logs,
//     impersonation_tokens, api_usage_daily -> 20260601_unify_shared_schemas.sql
//   - system_settings                       -> 20260314_system_settings.sql
//   - support_ticket_seeding_log            -> 20260312_help_desk_enhancements.sql
// Keep these in sync with the migration SQL if those tables change.

import type { Database as Generated, Json } from "./database.generated";

type AdminOnlyTables = {
  feature_flags: {
    Row: {
      id: string;
      key: string;
      name: string;
      description: string | null;
      enabled_globally: boolean | null;
      enabled_for_orgs: string[] | null;
      enabled_for_users: string[] | null;
      created_at: string | null;
      updated_at: string | null;
    };
    Insert: {
      id?: string;
      key: string;
      name: string;
      description?: string | null;
      enabled_globally?: boolean | null;
      enabled_for_orgs?: string[] | null;
      enabled_for_users?: string[] | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Update: {
      id?: string;
      key?: string;
      name?: string;
      description?: string | null;
      enabled_globally?: boolean | null;
      enabled_for_orgs?: string[] | null;
      enabled_for_users?: string[] | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Relationships: [];
  };
  system_health_checks: {
    Row: {
      id: string;
      service_name: string;
      status: string;
      latency_ms: number | null;
      error_message: string | null;
      checked_at: string | null;
    };
    Insert: {
      id?: string;
      service_name: string;
      status: string;
      latency_ms?: number | null;
      error_message?: string | null;
      checked_at?: string | null;
    };
    Update: {
      id?: string;
      service_name?: string;
      status?: string;
      latency_ms?: number | null;
      error_message?: string | null;
      checked_at?: string | null;
    };
    Relationships: [];
  };
  admin_audit_logs: {
    Row: {
      id: string;
      admin_id: string;
      admin_email: string;
      action: string;
      target_type: string;
      target_id: string | null;
      target_name: string | null;
      metadata: Json | null;
      ip_address: unknown | null;
      user_agent: string | null;
      created_at: string | null;
    };
    Insert: {
      id?: string;
      admin_id: string;
      admin_email: string;
      action: string;
      target_type: string;
      target_id?: string | null;
      target_name?: string | null;
      metadata?: Json | null;
      ip_address?: unknown | null;
      user_agent?: string | null;
      created_at?: string | null;
    };
    Update: {
      id?: string;
      admin_id?: string;
      admin_email?: string;
      action?: string;
      target_type?: string;
      target_id?: string | null;
      target_name?: string | null;
      metadata?: Json | null;
      ip_address?: unknown | null;
      user_agent?: string | null;
      created_at?: string | null;
    };
    Relationships: [];
  };
  admin_error_logs: {
    Row: {
      id: string;
      error_type: string;
      message: string;
      stack_trace: string | null;
      user_id: string | null;
      org_id: string | null;
      path: string | null;
      metadata: Json | null;
      created_at: string | null;
    };
    Insert: {
      id?: string;
      error_type: string;
      message: string;
      stack_trace?: string | null;
      user_id?: string | null;
      org_id?: string | null;
      path?: string | null;
      metadata?: Json | null;
      created_at?: string | null;
    };
    Update: {
      id?: string;
      error_type?: string;
      message?: string;
      stack_trace?: string | null;
      user_id?: string | null;
      org_id?: string | null;
      path?: string | null;
      metadata?: Json | null;
      created_at?: string | null;
    };
    Relationships: [];
  };
  impersonation_tokens: {
    Row: {
      id: string;
      token_hash: string;
      admin_id: string;
      admin_email: string;
      target_user_id: string;
      target_user_email: string;
      expires_at: string;
      used_at: string | null;
      created_at: string | null;
    };
    Insert: {
      id?: string;
      token_hash: string;
      admin_id: string;
      admin_email: string;
      target_user_id: string;
      target_user_email: string;
      expires_at: string;
      used_at?: string | null;
      created_at?: string | null;
    };
    Update: {
      id?: string;
      token_hash?: string;
      admin_id?: string;
      admin_email?: string;
      target_user_id?: string;
      target_user_email?: string;
      expires_at?: string;
      used_at?: string | null;
      created_at?: string | null;
    };
    Relationships: [];
  };
  api_usage_daily: {
    Row: {
      id: string;
      date: string;
      endpoint: string;
      method: string;
      count: number;
      unique_users: number;
      created_at: string | null;
      updated_at: string | null;
    };
    Insert: {
      id?: string;
      date?: string;
      endpoint: string;
      method: string;
      count?: number;
      unique_users?: number;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Update: {
      id?: string;
      date?: string;
      endpoint?: string;
      method?: string;
      count?: number;
      unique_users?: number;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Relationships: [];
  };
  system_settings: {
    Row: {
      key: string;
      value: string;
      created_at: string | null;
      updated_at: string | null;
    };
    Insert: {
      key: string;
      value: string;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Update: {
      key?: string;
      value?: string;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Relationships: [];
  };
  support_ticket_seeding_log: {
    Row: {
      id: string;
      seeded_by: string | null;
      tickets_seeded: number;
      strategy: string;
      respect_schedule: boolean | null;
      max_per_agent: number | null;
      categories: string[] | null;
      created_at: string | null;
    };
    Insert: {
      id?: string;
      seeded_by?: string | null;
      tickets_seeded: number;
      strategy: string;
      respect_schedule?: boolean | null;
      max_per_agent?: number | null;
      categories?: string[] | null;
      created_at?: string | null;
    };
    Update: {
      id?: string;
      seeded_by?: string | null;
      tickets_seeded?: number;
      strategy?: string;
      respect_schedule?: boolean | null;
      max_per_agent?: number | null;
      categories?: string[] | null;
      created_at?: string | null;
    };
    Relationships: [];
  };
};

export type Database = Omit<Generated, "public"> & {
  public: Omit<Generated["public"], "Tables"> & {
    Tables: Generated["public"]["Tables"] & AdminOnlyTables;
  };
};

export type { Json };
