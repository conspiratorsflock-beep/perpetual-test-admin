// AUTO-GENERATED from Supabase project zonsnvcwtfotqzrvozqs (DEV).
// Regenerate: npx supabase gen types typescript --linked > src/types/database.generated.ts
// Do NOT hand-edit.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_announcements: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          link_text: string | null
          link_url: string | null
          message: string
          org_id: string | null
          starts_at: string
          style: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at?: string | null
          id?: string
          link_text?: string | null
          link_url?: string | null
          message: string
          org_id?: string | null
          starts_at?: string
          style?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          link_text?: string | null
          link_url?: string | null
          message?: string
          org_id?: string | null
          starts_at?: string
          style?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_email: string
          admin_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          target_id: string | null
          target_name: string | null
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_email: string
          admin_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_name?: string | null
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_name?: string | null
          target_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_error_logs: {
        Row: {
          created_at: string | null
          error_type: string
          id: string
          message: string
          metadata: Json | null
          org_id: string | null
          path: string | null
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_type: string
          id?: string
          message: string
          metadata?: Json | null
          org_id?: string | null
          path?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          org_id?: string | null
          path?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_key_usage: {
        Row: {
          api_key_id: string
          endpoint: string
          id: string
          ip_address: unknown
          method: string
          org_id: string
          rate_limit_hit: boolean | null
          request_at: string | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id: string
          endpoint: string
          id?: string
          ip_address?: unknown
          method: string
          org_id: string
          rate_limit_hit?: boolean | null
          request_at?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string
          endpoint?: string
          id?: string
          ip_address?: unknown
          method?: string
          org_id?: string
          rate_limit_hit?: boolean | null
          request_at?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          monthly_quota_override: number | null
          monthly_usage: number
          name: string
          org_id: string
          project_id: string | null
          rate_limit_per_minute: number
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          monthly_quota_override?: number | null
          monthly_usage?: number
          name: string
          org_id: string
          project_id?: string | null
          rate_limit_per_minute?: number
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          monthly_quota_override?: number | null
          monthly_usage?: number
          name?: string
          org_id?: string
          project_id?: string | null
          rate_limit_per_minute?: number
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          error: boolean | null
          error_message: string | null
          id: string
          ip_address: unknown
          method: string
          org_id: string | null
          response_time_ms: number | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          error?: boolean | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method: string
          org_id?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          error?: boolean | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method?: string
          org_id?: string | null
          response_time_ms?: number | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attachment_upload_sessions: {
        Row: {
          attachment_id: string | null
          completed_at: string | null
          content_type: string
          created_at: string | null
          device_id: string | null
          execution_id: string | null
          expires_at: string | null
          filename: string
          id: string
          org_id: string
          size_bytes: number
          status: string | null
          storage_key: string | null
          storage_provider: string | null
          upload_url: string | null
          upload_url_expires_at: string | null
          user_id: string
        }
        Insert: {
          attachment_id?: string | null
          completed_at?: string | null
          content_type: string
          created_at?: string | null
          device_id?: string | null
          execution_id?: string | null
          expires_at?: string | null
          filename: string
          id?: string
          org_id: string
          size_bytes: number
          status?: string | null
          storage_key?: string | null
          storage_provider?: string | null
          upload_url?: string | null
          upload_url_expires_at?: string | null
          user_id: string
        }
        Update: {
          attachment_id?: string | null
          completed_at?: string | null
          content_type?: string
          created_at?: string | null
          device_id?: string | null
          execution_id?: string | null
          expires_at?: string | null
          filename?: string
          id?: string
          org_id?: string
          size_bytes?: number
          status?: string | null
          storage_key?: string | null
          storage_provider?: string | null
          upload_url?: string | null
          upload_url_expires_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachment_upload_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_upload_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          org_id: string | null
          project_id: string | null
          resource_id: string
          resource_type: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          org_id?: string | null
          project_id?: string | null
          resource_id: string
          resource_type: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          org_id?: string | null
          project_id?: string | null
          resource_id?: string
          resource_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_devops_connections: {
        Row: {
          access_token: string
          ado_org_name: string | null
          ado_org_url: string
          ado_user_email: string | null
          created_at: string | null
          error_message: string | null
          id: string
          last_synced_at: string | null
          org_id: string
          refresh_token: string | null
          status: string | null
          sync_builds: boolean | null
          sync_projects: boolean | null
          sync_work_items: boolean | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          ado_org_name?: string | null
          ado_org_url: string
          ado_user_email?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          org_id: string
          refresh_token?: string | null
          status?: string | null
          sync_builds?: boolean | null
          sync_projects?: boolean | null
          sync_work_items?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          ado_org_name?: string | null
          ado_org_url?: string
          ado_user_email?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_synced_at?: string | null
          org_id?: string
          refresh_token?: string | null
          status?: string | null
          sync_builds?: boolean | null
          sync_projects?: boolean | null
          sync_work_items?: boolean | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "azure_devops_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_devops_project_mappings: {
        Row: {
          ado_project_id: string
          ado_project_name: string | null
          ado_subscription_id: string | null
          connection_id: string | null
          created_at: string | null
          default_work_item_type: string | null
          id: string
          pt_project_id: string | null
          sync_bugs: boolean | null
          sync_test_cases: boolean | null
        }
        Insert: {
          ado_project_id: string
          ado_project_name?: string | null
          ado_subscription_id?: string | null
          connection_id?: string | null
          created_at?: string | null
          default_work_item_type?: string | null
          id?: string
          pt_project_id?: string | null
          sync_bugs?: boolean | null
          sync_test_cases?: boolean | null
        }
        Update: {
          ado_project_id?: string
          ado_project_name?: string | null
          ado_subscription_id?: string | null
          connection_id?: string | null
          created_at?: string | null
          default_work_item_type?: string | null
          id?: string
          pt_project_id?: string | null
          sync_bugs?: boolean | null
          sync_test_cases?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "azure_devops_project_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "azure_devops_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "azure_devops_project_mappings_pt_project_id_fkey"
            columns: ["pt_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      azure_devops_webhook_events: {
        Row: {
          connection_id: string | null
          error_message: string | null
          event_id: string | null
          event_type: string
          id: string
          payload: Json | null
          processed: boolean | null
          processed_at: string | null
          received_at: string | null
        }
        Insert: {
          connection_id?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string | null
        }
        Update: {
          connection_id?: string | null
          error_message?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "azure_devops_webhook_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "azure_devops_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      build_queue: {
        Row: {
          api_key_id: string | null
          assigned_at: string | null
          assigned_release_id: string | null
          assigned_to_user_id: string | null
          branch: string | null
          build_number: string | null
          commit_sha: string | null
          created_at: string
          id: string
          metadata: Json | null
          name: string
          org_id: string
          project_id: string | null
          repo_url: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          api_key_id?: string | null
          assigned_at?: string | null
          assigned_release_id?: string | null
          assigned_to_user_id?: string | null
          branch?: string | null
          build_number?: string | null
          commit_sha?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          name: string
          org_id: string
          project_id?: string | null
          repo_url?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          api_key_id?: string | null
          assigned_at?: string | null
          assigned_release_id?: string | null
          assigned_to_user_id?: string | null
          branch?: string | null
          build_number?: string | null
          commit_sha?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string
          org_id?: string
          project_id?: string | null
          repo_url?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_queue_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_queue_assigned_release_id_fkey"
            columns: ["assigned_release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_queue_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_queue_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      build_requirements: {
        Row: {
          added_at: string
          added_by: string | null
          build_id: string
          requirement_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          build_id: string
          requirement_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          build_id?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_requirements_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_requirements_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_requirements_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      build_tags: {
        Row: {
          build_id: string
          tag_id: string
        }
        Insert: {
          build_id: string
          tag_id: string
        }
        Update: {
          build_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_tags_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      builds: {
        Row: {
          api_key_id: string | null
          cicd_artifacts: Json | null
          cicd_external_id: string | null
          cicd_provider: Database["public"]["Enums"]["cicd_provider"] | null
          cicd_run_url: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          id: string
          jira_version_id: string | null
          name: string
          project_id: string
          release_id: string | null
          source: Database["public"]["Enums"]["build_source"] | null
          source_metadata: Json | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          api_key_id?: string | null
          cicd_artifacts?: Json | null
          cicd_external_id?: string | null
          cicd_provider?: Database["public"]["Enums"]["cicd_provider"] | null
          cicd_run_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          jira_version_id?: string | null
          name: string
          project_id: string
          release_id?: string | null
          source?: Database["public"]["Enums"]["build_source"] | null
          source_metadata?: Json | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          api_key_id?: string | null
          cicd_artifacts?: Json | null
          cicd_external_id?: string | null
          cicd_provider?: Database["public"]["Enums"]["cicd_provider"] | null
          cicd_run_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          jira_version_id?: string | null
          name?: string
          project_id?: string
          release_id?: string | null
          source?: Database["public"]["Enums"]["build_source"] | null
          source_metadata?: Json | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "builds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builds_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builds_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cicd_connections: {
        Row: {
          config: Json | null
          connected_at: string | null
          connected_by: string | null
          created_at: string | null
          error_count: number | null
          error_message: string | null
          external_id: string | null
          id: string
          is_active: boolean | null
          last_event_at: string | null
          last_used_at: string | null
          project_id: string
          provider: Database["public"]["Enums"]["cicd_provider"]
          updated_at: string | null
          webhook_secret: string | null
          webhook_token: string | null
          webhook_url: string | null
        }
        Insert: {
          config?: Json | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          error_count?: number | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          last_event_at?: string | null
          last_used_at?: string | null
          project_id: string
          provider: Database["public"]["Enums"]["cicd_provider"]
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_token?: string | null
          webhook_url?: string | null
        }
        Update: {
          config?: Json | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          error_count?: number | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          last_event_at?: string | null
          last_used_at?: string | null
          project_id?: string
          provider?: Database["public"]["Enums"]["cicd_provider"]
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_token?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cicd_connections_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cicd_connections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cicd_pipeline_configs: {
        Row: {
          auto_create_build: boolean | null
          auto_create_test_run: boolean | null
          auto_submit_results: boolean | null
          branch_pattern: string | null
          connection_id: string
          created_at: string | null
          created_by: string | null
          default_environment: string | null
          id: string
          inheritance_policy: string | null
          is_active: boolean | null
          pipeline_id: string | null
          pipeline_name: string
          result_artifact_path: string | null
          result_format: string | null
          target_release_id: string | null
          updated_at: string | null
        }
        Insert: {
          auto_create_build?: boolean | null
          auto_create_test_run?: boolean | null
          auto_submit_results?: boolean | null
          branch_pattern?: string | null
          connection_id: string
          created_at?: string | null
          created_by?: string | null
          default_environment?: string | null
          id?: string
          inheritance_policy?: string | null
          is_active?: boolean | null
          pipeline_id?: string | null
          pipeline_name: string
          result_artifact_path?: string | null
          result_format?: string | null
          target_release_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_create_build?: boolean | null
          auto_create_test_run?: boolean | null
          auto_submit_results?: boolean | null
          branch_pattern?: string | null
          connection_id?: string
          created_at?: string | null
          created_by?: string | null
          default_environment?: string | null
          id?: string
          inheritance_policy?: string | null
          is_active?: boolean | null
          pipeline_id?: string | null
          pipeline_name?: string
          result_artifact_path?: string | null
          result_format?: string | null
          target_release_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cicd_pipeline_configs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "cicd_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cicd_pipeline_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cicd_pipeline_configs_target_release_id_fkey"
            columns: ["target_release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      cicd_webhook_events: {
        Row: {
          build_id: string | null
          build_queue_item_id: string | null
          connection_id: string
          error_message: string | null
          event_type: string
          external_run_id: string | null
          id: string
          ip_address: unknown
          payload: Json | null
          payload_size: number | null
          processed_at: string | null
          provider: Database["public"]["Enums"]["cicd_provider"]
          received_at: string | null
          status: string | null
          test_run_id: string | null
          user_agent: string | null
        }
        Insert: {
          build_id?: string | null
          build_queue_item_id?: string | null
          connection_id: string
          error_message?: string | null
          event_type: string
          external_run_id?: string | null
          id?: string
          ip_address?: unknown
          payload?: Json | null
          payload_size?: number | null
          processed_at?: string | null
          provider: Database["public"]["Enums"]["cicd_provider"]
          received_at?: string | null
          status?: string | null
          test_run_id?: string | null
          user_agent?: string | null
        }
        Update: {
          build_id?: string | null
          build_queue_item_id?: string | null
          connection_id?: string
          error_message?: string | null
          event_type?: string
          external_run_id?: string | null
          id?: string
          ip_address?: unknown
          payload?: Json | null
          payload_size?: number | null
          processed_at?: string | null
          provider?: Database["public"]["Enums"]["cicd_provider"]
          received_at?: string | null
          status?: string | null
          test_run_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cicd_webhook_events_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cicd_webhook_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "cicd_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cicd_webhook_events_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      code_changes: {
        Row: {
          breaking_change: boolean
          build_id: string
          created_at: string
          created_by: string | null
          features_affected: Json
          files_changed: Json
          id: string
          previous_build_id: string | null
          security_fix: boolean
          test_cases_impacted: string[]
        }
        Insert: {
          breaking_change?: boolean
          build_id: string
          created_at?: string
          created_by?: string | null
          features_affected?: Json
          files_changed?: Json
          id?: string
          previous_build_id?: string | null
          security_fix?: boolean
          test_cases_impacted?: string[]
        }
        Update: {
          breaking_change?: boolean
          build_id?: string
          created_at?: string
          created_by?: string | null
          features_affected?: Json
          files_changed?: Json
          id?: string
          previous_build_id?: string | null
          security_fix?: boolean
          test_cases_impacted?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "code_changes_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_changes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_changes_previous_build_id_fkey"
            columns: ["previous_build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
        ]
      }
      configuration_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_required: boolean | null
          name: string
          project_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          name: string
          project_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          name?: string
          project_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuration_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      configurations: {
        Row: {
          created_at: string | null
          description: string | null
          group_id: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          group_id: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          group_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "configurations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "configuration_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
          org_id: string
          system_role_key: string | null
          template_role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          org_id: string
          system_role_key?: string | null
          template_role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          org_id?: string
          system_role_key?: string | null
          template_role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_variables: {
        Row: {
          created_at: string | null
          execution_id: string
          id: string
          resolved_value: string
          source: string
          variable_name: string
        }
        Insert: {
          created_at?: string | null
          execution_id: string
          id?: string
          resolved_value: string
          source: string
          variable_name: string
        }
        Update: {
          created_at?: string | null
          execution_id?: string
          id?: string
          resolved_value?: string
          source?: string
          variable_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_variables_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "test_case_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled_for_orgs: string[] | null
          enabled_for_users: string[] | null
          enabled_globally: boolean | null
          id: string
          key: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled_for_orgs?: string[] | null
          enabled_for_users?: string[] | null
          enabled_globally?: boolean | null
          id?: string
          key: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled_for_orgs?: string[] | null
          enabled_for_users?: string[] | null
          enabled_globally?: boolean | null
          id?: string
          key?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gherkin_examples: {
        Row: {
          created_at: string | null
          headers: string[]
          id: string
          rows: Json
          sort_order: number | null
          table_name: string
          test_case_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          headers: string[]
          id?: string
          rows?: Json
          sort_order?: number | null
          table_name?: string
          test_case_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          headers?: string[]
          id?: string
          rows?: Json
          sort_order?: number | null
          table_name?: string
          test_case_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gherkin_examples_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      gherkin_tags: {
        Row: {
          created_at: string | null
          id: string
          tag: string
          test_case_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag: string
          test_case_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          tag?: string
          test_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gherkin_tags_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          clerk_user_id: string
          group_id: string
          joined_at: string | null
        }
        Insert: {
          clerk_user_id: string
          group_id: string
          joined_at?: string | null
        }
        Update: {
          clerk_user_id?: string
          group_id?: string
          joined_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_tokens: {
        Row: {
          admin_email: string
          admin_id: string
          created_at: string | null
          expires_at: string
          id: string
          target_user_email: string
          target_user_id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          admin_email: string
          admin_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          target_user_email: string
          target_user_id: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          admin_email?: string
          admin_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          target_user_email?: string
          target_user_id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: []
      }
      integration_event_log: {
        Row: {
          created_at: string
          destination_id: string | null
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          event_type: string
          id: string
          org_id: string
          payload: Json | null
          project_id: string | null
          rule_id: string | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          destination_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          org_id: string
          payload?: Json | null
          project_id?: string | null
          rule_id?: string | null
          source: string
          status?: string
        }
        Update: {
          created_at?: string
          destination_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          org_id?: string
          payload?: Json | null
          project_id?: string | null
          rule_id?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_event_log_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "integration_notification_destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_event_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_event_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_event_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "integration_notification_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_notification_destinations: {
        Row: {
          channel_id: string
          channel_name: string
          connection_id: string | null
          created_at: string
          destination_type: string
          id: string
          rule_id: string
        }
        Insert: {
          channel_id: string
          channel_name: string
          connection_id?: string | null
          created_at?: string
          destination_type: string
          id?: string
          rule_id: string
        }
        Update: {
          channel_id?: string
          channel_name?: string
          connection_id?: string | null
          created_at?: string
          destination_type?: string
          id?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_notification_destinations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "integration_notification_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_notification_rules: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          label: string | null
          org_id: string
          project_id: string | null
          trigger_event: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          label?: string | null
          org_id: string
          project_id?: string | null
          trigger_event: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          label?: string | null
          org_id?: string
          project_id?: string | null
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_notification_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_notification_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_connections: {
        Row: {
          access_token: string
          created_at: string | null
          error_message: string | null
          id: string
          jira_site_name: string
          jira_site_url: string
          jira_user_email: string
          last_synced_at: string | null
          org_id: string
          refresh_token: string
          scopes: string[] | null
          status: string
          token_expires_at: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          jira_site_name: string
          jira_site_url: string
          jira_user_email: string
          last_synced_at?: string | null
          org_id: string
          refresh_token: string
          scopes?: string[] | null
          status?: string
          token_expires_at: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          jira_site_name?: string
          jira_site_url?: string
          jira_user_email?: string
          last_synced_at?: string | null
          org_id?: string
          refresh_token?: string
          scopes?: string[] | null
          status?: string
          token_expires_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      jira_field_mappings: {
        Row: {
          config_id: string
          created_at: string | null
          id: string
          is_active: boolean
          jira_field_id: string
          jira_field_name: string
          order: number
          pt_field: string
          template: string | null
          transformation: string
          updated_at: string | null
        }
        Insert: {
          config_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          jira_field_id: string
          jira_field_name: string
          order?: number
          pt_field: string
          template?: string | null
          transformation?: string
          updated_at?: string | null
        }
        Update: {
          config_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          jira_field_id?: string
          jira_field_name?: string
          order?: number
          pt_field?: string
          template?: string | null
          transformation?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_field_mappings_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "jira_project_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_project_configs: {
        Row: {
          created_at: string | null
          custom_fields: Json | null
          default_issue_type: string
          default_labels: string[] | null
          id: string
          issue_type_id: string
          jira_project_id: string
          jira_project_key: string
          jira_project_name: string
          priority_mappings: Json | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_fields?: Json | null
          default_issue_type?: string
          default_labels?: string[] | null
          id?: string
          issue_type_id: string
          jira_project_id: string
          jira_project_key: string
          jira_project_name: string
          priority_mappings?: Json | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_fields?: Json | null
          default_issue_type?: string
          default_labels?: string[] | null
          id?: string
          issue_type_id?: string
          jira_project_id?: string
          jira_project_key?: string
          jira_project_name?: string
          priority_mappings?: Json | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_project_configs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      jira_push_logs: {
        Row: {
          attachments_snapshot: Json
          build_id: string | null
          created_at: string | null
          description_snapshot: string
          error_message: string | null
          execution_id: string
          id: string
          jira_issue_id: string
          jira_issue_key: string
          jira_issue_url: string
          jira_priority: string | null
          jira_resolution: string | null
          jira_status: string | null
          last_synced_at: string | null
          notes_snapshot: string | null
          org_id: string
          project_id: string
          pushed_at: string
          pushed_by: string | null
          result_snapshot: string
          retry_count: number
          run_id: string
          status: string
          steps_snapshot: Json
          test_case_id: string
          title_snapshot: string
          updated_at: string | null
        }
        Insert: {
          attachments_snapshot?: Json
          build_id?: string | null
          created_at?: string | null
          description_snapshot: string
          error_message?: string | null
          execution_id: string
          id?: string
          jira_issue_id: string
          jira_issue_key: string
          jira_issue_url: string
          jira_priority?: string | null
          jira_resolution?: string | null
          jira_status?: string | null
          last_synced_at?: string | null
          notes_snapshot?: string | null
          org_id: string
          project_id: string
          pushed_at?: string
          pushed_by?: string | null
          result_snapshot: string
          retry_count?: number
          run_id: string
          status?: string
          steps_snapshot?: Json
          test_case_id: string
          title_snapshot: string
          updated_at?: string | null
        }
        Update: {
          attachments_snapshot?: Json
          build_id?: string | null
          created_at?: string | null
          description_snapshot?: string
          error_message?: string | null
          execution_id?: string
          id?: string
          jira_issue_id?: string
          jira_issue_key?: string
          jira_issue_url?: string
          jira_priority?: string | null
          jira_resolution?: string | null
          jira_status?: string | null
          last_synced_at?: string | null
          notes_snapshot?: string | null
          org_id?: string
          project_id?: string
          pushed_at?: string
          pushed_by?: string | null
          result_snapshot?: string
          retry_count?: number
          run_id?: string
          status?: string
          steps_snapshot?: Json
          test_case_id?: string
          title_snapshot?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jira_push_logs_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_push_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "test_case_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_push_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_push_logs_pushed_by_fkey"
            columns: ["pushed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_push_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jira_push_logs_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      org_api_usage: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          overage_count: number
          quota: number
          total_calls: number
          updated_at: string | null
          warning_100_sent_at: string | null
          warning_80_sent_at: string | null
          year_month: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          overage_count?: number
          quota: number
          total_calls?: number
          updated_at?: string | null
          warning_100_sent_at?: string | null
          warning_80_sent_at?: string | null
          year_month: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          overage_count?: number
          quota?: number
          total_calls?: number
          updated_at?: string | null
          warning_100_sent_at?: string | null
          warning_80_sent_at?: string | null
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_api_usage_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          default_coverage_target_pct: number
          default_environment: string
          default_inheritance_policy: string
          default_notification_channel: string
          feature_requirements_enabled: boolean
          id: string
          notify_on_build_status_change: boolean
          notify_on_run_complete: boolean
          org_id: string
          require_2fa: boolean
          session_timeout_minutes: number
          updated_at: string
        }
        Insert: {
          default_coverage_target_pct?: number
          default_environment?: string
          default_inheritance_policy?: string
          default_notification_channel?: string
          feature_requirements_enabled?: boolean
          id?: string
          notify_on_build_status_change?: boolean
          notify_on_run_complete?: boolean
          org_id: string
          require_2fa?: boolean
          session_timeout_minutes?: number
          updated_at?: string
        }
        Update: {
          default_coverage_target_pct?: number
          default_environment?: string
          default_inheritance_policy?: string
          default_notification_channel?: string
          feature_requirements_enabled?: boolean
          id?: string
          notify_on_build_status_change?: boolean
          notify_on_run_complete?: boolean
          org_id?: string
          require_2fa?: boolean
          session_timeout_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_variables: {
        Row: {
          config: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          organization_id: string
          subtype: string | null
          type: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
          subtype?: string | null
          type: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          subtype?: string | null
          type?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_variables_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_variables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          api_monthly_quota: number | null
          clerk_org_id: string | null
          created_at: string | null
          id: string
          lead_count: number
          name: string
          slug: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tester_count: number
          trial_ends_at: string | null
          trial_extension_used: boolean | null
          trial_hard_lock_sent_at: string | null
          trial_lock_state: string
          trial_soft_lock_sent_at: string | null
          trial_started_at: string | null
          trial_warning_sent_at: string | null
          updated_at: string | null
        }
        Insert: {
          api_monthly_quota?: number | null
          clerk_org_id?: string | null
          created_at?: string | null
          id?: string
          lead_count?: number
          name: string
          slug?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tester_count?: number
          trial_ends_at?: string | null
          trial_extension_used?: boolean | null
          trial_hard_lock_sent_at?: string | null
          trial_lock_state?: string
          trial_soft_lock_sent_at?: string | null
          trial_started_at?: string | null
          trial_warning_sent_at?: string | null
          updated_at?: string | null
        }
        Update: {
          api_monthly_quota?: number | null
          clerk_org_id?: string | null
          created_at?: string | null
          id?: string
          lead_count?: number
          name?: string
          slug?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tester_count?: number
          trial_ends_at?: string | null
          trial_extension_used?: boolean | null
          trial_hard_lock_sent_at?: string | null
          trial_lock_state?: string
          trial_soft_lock_sent_at?: string | null
          trial_started_at?: string | null
          trial_warning_sent_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pending_org_invitations: {
        Row: {
          accepted_at: string | null
          add_to_all_projects: boolean
          clerk_invitation_id: string | null
          created_at: string | null
          email: string
          id: string
          invited_by: string
          org_id: string
          org_role: string
          project_ids: string[] | null
          project_role: string
        }
        Insert: {
          accepted_at?: string | null
          add_to_all_projects?: boolean
          clerk_invitation_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          invited_by: string
          org_id: string
          org_role: string
          project_ids?: string[] | null
          project_role?: string
        }
        Update: {
          accepted_at?: string | null
          add_to_all_projects?: boolean
          clerk_invitation_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          invited_by?: string
          org_id?: string
          org_role?: string
          project_ids?: string[] | null
          project_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_org_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          description: string | null
          id: string
          is_restricted: boolean
          level: string
          resource: string
        }
        Insert: {
          action: string
          description?: string | null
          id: string
          is_restricted?: boolean
          level: string
          resource: string
        }
        Update: {
          action?: string
          description?: string | null
          id?: string
          is_restricted?: boolean
          level?: string
          resource?: string
        }
        Relationships: []
      }
      project_environments: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          project_id: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          project_id: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          project_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_environments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_group_access: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          group_id: string
          id: string
          project_id: string
          role_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          group_id: string
          id?: string
          project_id: string
          role_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          group_id?: string
          id?: string
          project_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_group_access_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_group_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_group_access_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          assigned_via_group_id: string | null
          clerk_user_id: string
          custom_role_id: string | null
          display_name: string | null
          email: string
          id: string
          joined_at: string | null
          project_id: string
        }
        Insert: {
          assigned_via_group_id?: string | null
          clerk_user_id: string
          custom_role_id?: string | null
          display_name?: string | null
          email: string
          id?: string
          joined_at?: string | null
          project_id: string
        }
        Update: {
          assigned_via_group_id?: string | null
          clerk_user_id?: string
          custom_role_id?: string | null
          display_name?: string | null
          email?: string
          id?: string
          joined_at?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_assigned_via_group_id_fkey"
            columns: ["assigned_via_group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_report_subscribers: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
          project_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
          project_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_report_subscribers_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_report_subscribers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sprint_config: {
        Row: {
          created_at: string | null
          enabled: boolean
          first_sprint_number: number
          first_sprint_start_date: string | null
          length_weeks: number
          project_id: string
          start_day_of_week: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          first_sprint_number?: number
          first_sprint_start_date?: string | null
          length_weeks?: number
          project_id: string
          start_day_of_week?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          first_sprint_number?: number
          first_sprint_start_date?: string | null
          length_weeks?: number
          project_id?: string
          start_day_of_week?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_sprint_config_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_variables: {
        Row: {
          config: Json | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          project_id: string
          subtype: string | null
          type: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          project_id: string
          subtype?: string | null
          type: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          project_id?: string
          subtype?: string | null
          type?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_variables_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_variables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          bitbucket_repo_url: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          jira_project_key: string | null
          jira_site_url: string | null
          name: string
          org_id: string
          project_code: string | null
          requirements_enabled: boolean
          updated_at: string | null
          weekly_report_enabled: boolean
        }
        Insert: {
          bitbucket_repo_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          jira_project_key?: string | null
          jira_site_url?: string | null
          name: string
          org_id: string
          project_code?: string | null
          requirements_enabled?: boolean
          updated_at?: string | null
          weekly_report_enabled?: boolean
        }
        Update: {
          bitbucket_repo_url?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          jira_project_key?: string | null
          jira_site_url?: string | null
          name?: string
          org_id?: string
          project_code?: string | null
          requirements_enabled?: boolean
          updated_at?: string | null
          weekly_report_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      release_report_executions: {
        Row: {
          execution_id: string
          pinned_at: string
          pinned_by: string | null
          release_id: string
        }
        Insert: {
          execution_id: string
          pinned_at?: string
          pinned_by?: string | null
          release_id: string
        }
        Update: {
          execution_id?: string
          pinned_at?: string
          pinned_by?: string | null
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_report_executions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "test_case_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_report_executions_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_report_executions_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      release_report_runs: {
        Row: {
          pinned_at: string
          pinned_by: string | null
          release_id: string
          run_id: string
        }
        Insert: {
          pinned_at?: string
          pinned_by?: string | null
          release_id: string
          run_id: string
        }
        Update: {
          pinned_at?: string
          pinned_by?: string | null
          release_id?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_report_runs_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_report_runs_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_report_runs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      release_requirements: {
        Row: {
          added_at: string
          added_by: string | null
          release_id: string
          requirement_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          release_id: string
          requirement_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          release_id?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_requirements_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_requirements_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_requirements_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          pinned_build_id: string | null
          project_id: string
          status: string | null
          target_date: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          pinned_build_id?: string | null
          project_id: string
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          pinned_build_id?: string | null
          project_id?: string
          status?: string | null
          target_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "releases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "releases_pinned_build_id_fkey"
            columns: ["pinned_build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "releases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "releases_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      requirements: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          external_id: string | null
          id: string
          project_id: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          project_id: string
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          project_id?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      section_tags: {
        Row: {
          section_id: string
          tag_id: string
        }
        Insert: {
          section_id: string
          tag_id: string
        }
        Update: {
          section_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_tags_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          parent_section_id: string | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_section_id?: string | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_section_id?: string | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_parent_section_id_fkey"
            columns: ["parent_section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_connections: {
        Row: {
          channel_name: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          last_used_at: string | null
          notify_build_readiness: boolean
          notify_run_completed: boolean
          notify_run_submitted: boolean
          org_id: string
          status: string
          updated_at: string
          webhook_url: string
          workspace_name: string | null
        }
        Insert: {
          channel_name?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          last_used_at?: string | null
          notify_build_readiness?: boolean
          notify_run_completed?: boolean
          notify_run_submitted?: boolean
          org_id: string
          status?: string
          updated_at?: string
          webhook_url: string
          workspace_name?: string | null
        }
        Update: {
          channel_name?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          last_used_at?: string | null
          notify_build_readiness?: boolean
          notify_run_completed?: boolean
          notify_run_submitted?: boolean
          org_id?: string
          status?: string
          updated_at?: string
          webhook_url?: string
          workspace_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slack_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          received_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          received_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          received_at?: string
        }
        Relationships: []
      }
      support_canned_responses: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      support_sla_config: {
        Row: {
          business_hours_only: boolean | null
          created_at: string | null
          first_response_hours: number
          id: string
          priority: string
          resolution_hours: number | null
          updated_at: string | null
        }
        Insert: {
          business_hours_only?: boolean | null
          created_at?: string | null
          first_response_hours: number
          id?: string
          priority: string
          resolution_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          business_hours_only?: boolean | null
          created_at?: string | null
          first_response_hours?: number
          id?: string
          priority?: string
          resolution_hours?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_team_members: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_available: boolean | null
          max_open_tickets: number | null
          name: string | null
          role: string
          skills: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_available?: boolean | null
          max_open_tickets?: number | null
          name?: string | null
          role?: string
          skills?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_available?: boolean | null
          max_open_tickets?: number | null
          name?: string | null
          role?: string
          skills?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      support_ticket_comments: {
        Row: {
          attachments: Json | null
          author_email: string | null
          author_id: string
          author_name: string | null
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
          is_edited: boolean | null
          is_internal: boolean | null
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          author_email?: string | null
          author_id: string
          author_name?: string | null
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_internal?: boolean | null
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          author_email?: string | null
          author_id?: string
          author_name?: string | null
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_internal?: boolean | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          performed_by: string
          performed_by_name: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          performed_by: string
          performed_by_name?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          performed_by?: string
          performed_by_name?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          resource_id: string
          resource_name: string | null
          resource_type: string
          resource_url: string | null
          ticket_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          resource_id: string
          resource_name?: string | null
          resource_type: string
          resource_url?: string | null
          ticket_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          resource_id?: string
          resource_name?: string | null
          resource_type?: string
          resource_url?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_links_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_seeding_log: {
        Row: {
          categories: string[] | null
          created_at: string | null
          id: string
          max_per_agent: number | null
          respect_schedule: boolean | null
          seeded_by: string | null
          strategy: string
          tickets_seeded: number
        }
        Insert: {
          categories?: string[] | null
          created_at?: string | null
          id?: string
          max_per_agent?: number | null
          respect_schedule?: boolean | null
          seeded_by?: string | null
          strategy: string
          tickets_seeded: number
        }
        Update: {
          categories?: string[] | null
          created_at?: string | null
          id?: string
          max_per_agent?: number | null
          respect_schedule?: boolean | null
          seeded_by?: string | null
          strategy?: string
          tickets_seeded?: number
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          app_version: string | null
          assigned_to: string | null
          browser_info: string | null
          category: string
          closed_at: string | null
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          org_id: string | null
          os_info: string | null
          priority: string
          resolved_at: string | null
          sla_deadline: string | null
          source: string
          status: string
          subject: string
          ticket_number: number
          updated_at: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          app_version?: string | null
          assigned_to?: string | null
          browser_info?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          org_id?: string | null
          os_info?: string | null
          priority?: string
          resolved_at?: string | null
          sla_deadline?: string | null
          source?: string
          status?: string
          subject: string
          ticket_number?: number
          updated_at?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          app_version?: string | null
          assigned_to?: string | null
          browser_info?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          org_id?: string | null
          os_info?: string | null
          priority?: string
          resolved_at?: string | null
          sla_deadline?: string | null
          source?: string
          status?: string
          subject?: string
          ticket_number?: number
          updated_at?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      sync_conflicts: {
        Row: {
          client_data: Json
          detected_at: string | null
          device_id: string
          id: string
          org_id: string
          record_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_data: Json | null
          server_data: Json
          status: string | null
          sync_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          client_data: Json
          detected_at?: string | null
          device_id: string
          id?: string
          org_id: string
          record_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_data?: Json | null
          server_data: Json
          status?: string | null
          sync_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          client_data?: Json
          detected_at?: string | null
          device_id?: string
          id?: string
          org_id?: string
          record_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_data?: Json | null
          server_data?: Json
          status?: string | null
          sync_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_conflicts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_conflicts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_conflicts_sync_id_fkey"
            columns: ["sync_id"]
            isOneToOne: false
            referencedRelation: "sync_operations"
            referencedColumns: ["sync_id"]
          },
        ]
      }
      sync_operations: {
        Row: {
          changes_summary: Json | null
          completed_at: string | null
          conflict_count: number | null
          created_at: string | null
          device_id: string
          direction: string
          error_count: number | null
          error_message: string | null
          id: string
          org_id: string
          processed_count: number | null
          since: string | null
          started_at: string | null
          status: string
          sync_id: string
          user_id: string
        }
        Insert: {
          changes_summary?: Json | null
          completed_at?: string | null
          conflict_count?: number | null
          created_at?: string | null
          device_id: string
          direction: string
          error_count?: number | null
          error_message?: string | null
          id?: string
          org_id: string
          processed_count?: number | null
          since?: string | null
          started_at?: string | null
          status?: string
          sync_id: string
          user_id: string
        }
        Update: {
          changes_summary?: Json | null
          completed_at?: string | null
          conflict_count?: number | null
          created_at?: string | null
          device_id?: string
          direction?: string
          error_count?: number | null
          error_message?: string | null
          id?: string
          org_id?: string
          processed_count?: number | null
          since?: string | null
          started_at?: string | null
          status?: string
          sync_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_operations_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_operations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_pending_changes: {
        Row: {
          action: string
          client_timestamp: string
          conflict_resolution: string | null
          conflict_resolved_at: string | null
          created_at: string | null
          data: Json
          device_id: string
          error_message: string | null
          id: string
          local_id: string | null
          org_id: string
          processed_at: string | null
          record_id: string
          server_record_id: string | null
          status: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          client_timestamp: string
          conflict_resolution?: string | null
          conflict_resolved_at?: string | null
          created_at?: string | null
          data: Json
          device_id: string
          error_message?: string | null
          id?: string
          local_id?: string | null
          org_id: string
          processed_at?: string | null
          record_id: string
          server_record_id?: string | null
          status?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          client_timestamp?: string
          conflict_resolution?: string | null
          conflict_resolved_at?: string | null
          created_at?: string | null
          data?: Json
          device_id?: string
          error_message?: string | null
          id?: string
          local_id?: string | null
          org_id?: string
          processed_at?: string | null
          record_id?: string
          server_record_id?: string | null
          status?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_pending_changes_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_pending_changes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_checks: {
        Row: {
          checked_at: string | null
          error_message: string | null
          id: string
          latency_ms: number | null
          service_name: string
          status: string
        }
        Insert: {
          checked_at?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          service_name: string
          status: string
        }
        Update: {
          checked_at?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          service_name?: string
          status?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          archived_at: string | null
          category: string | null
          color: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          org_id: string | null
          project_id: string | null
          sort_order: number | null
        }
        Insert: {
          archived_at?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          org_id?: string | null
          project_id?: string | null
          sort_order?: number | null
        }
        Update: {
          archived_at?: string | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          org_id?: string | null
          project_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      teams_connections: {
        Row: {
          channel_name: string | null
          created_at: string | null
          error_message: string | null
          id: string
          last_used_at: string | null
          notify_build_readiness: boolean | null
          notify_run_completed: boolean | null
          notify_run_submitted: boolean | null
          org_id: string
          status: string | null
          team_name: string | null
          tenant_name: string | null
          updated_at: string | null
          webhook_url: string
        }
        Insert: {
          channel_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_used_at?: string | null
          notify_build_readiness?: boolean | null
          notify_run_completed?: boolean | null
          notify_run_submitted?: boolean | null
          org_id: string
          status?: string | null
          team_name?: string | null
          tenant_name?: string | null
          updated_at?: string | null
          webhook_url: string
        }
        Update: {
          channel_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_used_at?: string | null
          notify_build_readiness?: boolean | null
          notify_run_completed?: boolean | null
          notify_run_submitted?: boolean | null
          org_id?: string
          status?: string | null
          team_name?: string | null
          tenant_name?: string | null
          updated_at?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_execution_configs: {
        Row: {
          comments: string | null
          configuration_id: string
          created_at: string | null
          defect_refs: string[] | null
          duration_seconds: number | null
          effective_status: string | null
          executed_at: string | null
          executed_by: string | null
          execution_id: string
          id: string
          inheritance_reason: string | null
          inherited_build_id: string | null
          inherited_from: string | null
          manually_verified_safe: boolean | null
          requires_retest: boolean | null
          result: string | null
          updated_at: string | null
          verified_in_build_id: string | null
        }
        Insert: {
          comments?: string | null
          configuration_id: string
          created_at?: string | null
          defect_refs?: string[] | null
          duration_seconds?: number | null
          effective_status?: string | null
          executed_at?: string | null
          executed_by?: string | null
          execution_id: string
          id?: string
          inheritance_reason?: string | null
          inherited_build_id?: string | null
          inherited_from?: string | null
          manually_verified_safe?: boolean | null
          requires_retest?: boolean | null
          result?: string | null
          updated_at?: string | null
          verified_in_build_id?: string | null
        }
        Update: {
          comments?: string | null
          configuration_id?: string
          created_at?: string | null
          defect_refs?: string[] | null
          duration_seconds?: number | null
          effective_status?: string | null
          executed_at?: string | null
          executed_by?: string | null
          execution_id?: string
          id?: string
          inheritance_reason?: string | null
          inherited_build_id?: string | null
          inherited_from?: string | null
          manually_verified_safe?: boolean | null
          requires_retest?: boolean | null
          result?: string | null
          updated_at?: string | null
          verified_in_build_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_case_execution_configs_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_execution_configs_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_execution_configs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "test_case_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_execution_configs_inherited_build_id_fkey"
            columns: ["inherited_build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_execution_configs_inherited_from_fkey"
            columns: ["inherited_from"]
            isOneToOne: false
            referencedRelation: "test_case_execution_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_execution_configs_verified_in_build_id_fkey"
            columns: ["verified_in_build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_executions: {
        Row: {
          assigned_to: string | null
          comments: string | null
          created_at: string | null
          effective_status: string | null
          executed_at: string | null
          executed_by: string | null
          id: string
          inheritance_reason: string | null
          inherited_build_id: string | null
          inherited_from: string | null
          jira_issue_key: string | null
          jira_issue_url: string | null
          jira_push_status: string | null
          jira_pushed_at: string | null
          manually_verified_safe: boolean
          requires_retest: boolean
          resolved_steps: Json | null
          result: string | null
          run_id: string
          sync_device_id: string | null
          synced_at: string | null
          test_case_id: string
          updated_at: string | null
          verified_in_build_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          comments?: string | null
          created_at?: string | null
          effective_status?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          inheritance_reason?: string | null
          inherited_build_id?: string | null
          inherited_from?: string | null
          jira_issue_key?: string | null
          jira_issue_url?: string | null
          jira_push_status?: string | null
          jira_pushed_at?: string | null
          manually_verified_safe?: boolean
          requires_retest?: boolean
          resolved_steps?: Json | null
          result?: string | null
          run_id: string
          sync_device_id?: string | null
          synced_at?: string | null
          test_case_id: string
          updated_at?: string | null
          verified_in_build_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          comments?: string | null
          created_at?: string | null
          effective_status?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          inheritance_reason?: string | null
          inherited_build_id?: string | null
          inherited_from?: string | null
          jira_issue_key?: string | null
          jira_issue_url?: string | null
          jira_push_status?: string | null
          jira_pushed_at?: string | null
          manually_verified_safe?: boolean
          requires_retest?: boolean
          resolved_steps?: Json | null
          result?: string | null
          run_id?: string
          sync_device_id?: string | null
          synced_at?: string | null
          test_case_id?: string
          updated_at?: string | null
          verified_in_build_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_case_executions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_executions_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_executions_inherited_from_fkey"
            columns: ["inherited_from"]
            isOneToOne: false
            referencedRelation: "test_case_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_executions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_executions_sync_device_id_fkey"
            columns: ["sync_device_id"]
            isOneToOne: false
            referencedRelation: "user_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_executions_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_executions_verified_in_build_id_fkey"
            columns: ["verified_in_build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_jira_links: {
        Row: {
          created_at: string | null
          id: string
          jira_issue_key: string
          link_type: string | null
          test_case_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          jira_issue_key: string
          link_type?: string | null
          test_case_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          jira_issue_key?: string
          link_type?: string | null
          test_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_case_jira_links_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_relations: {
        Row: {
          created_at: string | null
          id: string
          related_test_case_id: string
          relationship_type: string
          test_case_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          related_test_case_id: string
          relationship_type?: string
          test_case_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          related_test_case_id?: string
          relationship_type?: string
          test_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_case_relations_related_test_case_id_fkey"
            columns: ["related_test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_relations_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_tags: {
        Row: {
          tag_id: string
          test_case_id: string
        }
        Insert: {
          tag_id: string
          test_case_id: string
        }
        Update: {
          tag_id?: string
          test_case_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_case_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_tags_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          preconditions: string | null
          priority: string
          project_id: string
          steps: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          preconditions?: string | null
          priority?: string
          project_id: string
          steps?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          preconditions?: string | null
          priority?: string
          project_id?: string
          steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_case_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      test_case_version_history: {
        Row: {
          change_summary: string | null
          change_type: string
          changed_at: string | null
          changed_by: string | null
          created_at: string | null
          description_snapshot: string | null
          field_diff: Json | null
          gherkin_content_snapshot: string | null
          id: string
          preconditions_snapshot: string | null
          priority_snapshot: string | null
          status_snapshot: string | null
          steps_snapshot: Json | null
          test_case_id: string
          title_snapshot: string | null
          version: number
        }
        Insert: {
          change_summary?: string | null
          change_type: string
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          description_snapshot?: string | null
          field_diff?: Json | null
          gherkin_content_snapshot?: string | null
          id?: string
          preconditions_snapshot?: string | null
          priority_snapshot?: string | null
          status_snapshot?: string | null
          steps_snapshot?: Json | null
          test_case_id: string
          title_snapshot?: string | null
          version: number
        }
        Update: {
          change_summary?: string | null
          change_type?: string
          changed_at?: string | null
          changed_by?: string | null
          created_at?: string | null
          description_snapshot?: string | null
          field_diff?: Json | null
          gherkin_content_snapshot?: string | null
          id?: string
          preconditions_snapshot?: string | null
          priority_snapshot?: string | null
          status_snapshot?: string | null
          steps_snapshot?: Json | null
          test_case_id?: string
          title_snapshot?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_case_version_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_case_version_history_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      test_cases: {
        Row: {
          automation_status: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          execution_mode: string | null
          external_id: string | null
          gherkin_content: string | null
          gherkin_scenario_type: string | null
          id: string
          is_adhoc: boolean | null
          is_latest_version: boolean | null
          preconditions: string | null
          previous_version_id: string | null
          priority: string | null
          project_id: string
          section_id: string | null
          status: string | null
          steps: Json | null
          tc_sequence_number: number | null
          test_case_type: string | null
          title: string
          updated_at: string | null
          version: number | null
          version_notes: string | null
        }
        Insert: {
          automation_status?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          execution_mode?: string | null
          external_id?: string | null
          gherkin_content?: string | null
          gherkin_scenario_type?: string | null
          id?: string
          is_adhoc?: boolean | null
          is_latest_version?: boolean | null
          preconditions?: string | null
          previous_version_id?: string | null
          priority?: string | null
          project_id: string
          section_id?: string | null
          status?: string | null
          steps?: Json | null
          tc_sequence_number?: number | null
          test_case_type?: string | null
          title: string
          updated_at?: string | null
          version?: number | null
          version_notes?: string | null
        }
        Update: {
          automation_status?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          execution_mode?: string | null
          external_id?: string | null
          gherkin_content?: string | null
          gherkin_scenario_type?: string | null
          id?: string
          is_adhoc?: boolean | null
          is_latest_version?: boolean | null
          preconditions?: string | null
          previous_version_id?: string | null
          priority?: string | null
          project_id?: string
          section_id?: string | null
          status?: string | null
          steps?: Json | null
          tc_sequence_number?: number | null
          test_case_type?: string | null
          title?: string
          updated_at?: string | null
          version?: number | null
          version_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_cases_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_cases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_cases_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      test_run_baselines: {
        Row: {
          created_at: string | null
          id: string
          preconditions_snapshot: string | null
          steps_snapshot: Json | null
          test_case_id: string
          test_run_id: string
          title_snapshot: string | null
          version_used: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          preconditions_snapshot?: string | null
          steps_snapshot?: Json | null
          test_case_id: string
          test_run_id: string
          title_snapshot?: string | null
          version_used: number
        }
        Update: {
          created_at?: string | null
          id?: string
          preconditions_snapshot?: string | null
          steps_snapshot?: Json | null
          test_case_id?: string
          test_run_id?: string
          title_snapshot?: string | null
          version_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_run_baselines_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_run_baselines_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_run_configurations: {
        Row: {
          configuration_id: string
          created_at: string | null
          id: string
          test_run_id: string
        }
        Insert: {
          configuration_id: string
          created_at?: string | null
          id?: string
          test_run_id: string
        }
        Update: {
          configuration_id?: string
          created_at?: string | null
          id?: string
          test_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_run_configurations_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_run_configurations_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_run_requirements: {
        Row: {
          added_at: string
          added_by: string | null
          requirement_id: string
          test_run_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          requirement_id: string
          test_run_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          requirement_id?: string
          test_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_run_requirements_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_run_requirements_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_run_requirements_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      test_runs: {
        Row: {
          build_id: string | null
          completed_at: string | null
          configuration_count: number | null
          created_at: string | null
          created_by: string | null
          custom_environment: string | null
          description: string | null
          environment: string | null
          environment_id: string | null
          environment_snapshot: string | null
          id: string
          inheritance_policy: string | null
          name: string
          parent_run_id: string | null
          project_id: string
          release_id: string | null
          run_sequence_number: number | null
          started_at: string | null
          status: string | null
          tested_on_device_id: string | null
          tested_on_snapshot: string | null
          updated_at: string | null
        }
        Insert: {
          build_id?: string | null
          completed_at?: string | null
          configuration_count?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_environment?: string | null
          description?: string | null
          environment?: string | null
          environment_id?: string | null
          environment_snapshot?: string | null
          id?: string
          inheritance_policy?: string | null
          name: string
          parent_run_id?: string | null
          project_id: string
          release_id?: string | null
          run_sequence_number?: number | null
          started_at?: string | null
          status?: string | null
          tested_on_device_id?: string | null
          tested_on_snapshot?: string | null
          updated_at?: string | null
        }
        Update: {
          build_id?: string | null
          completed_at?: string | null
          configuration_count?: number | null
          created_at?: string | null
          created_by?: string | null
          custom_environment?: string | null
          description?: string | null
          environment?: string | null
          environment_id?: string | null
          environment_snapshot?: string | null
          id?: string
          inheritance_policy?: string | null
          name?: string
          parent_run_id?: string | null
          project_id?: string
          release_id?: string | null
          run_sequence_number?: number | null
          started_at?: string | null
          status?: string | null
          tested_on_device_id?: string | null
          tested_on_snapshot?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_runs_build_id_fkey"
            columns: ["build_id"]
            isOneToOne: false
            referencedRelation: "builds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_runs_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "project_environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_runs_parent_run_id_fkey"
            columns: ["parent_run_id"]
            isOneToOne: false
            referencedRelation: "test_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_runs_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_runs_tested_on_device_id_fkey"
            columns: ["tested_on_device_id"]
            isOneToOne: false
            referencedRelation: "user_test_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          app_version: string | null
          created_at: string | null
          device_id: string
          device_name: string | null
          id: string
          last_sync_at: string | null
          last_sync_id: string | null
          org_id: string
          os_version: string | null
          platform: string
          push_provider: string | null
          push_token: string | null
          settings: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string | null
          device_id: string
          device_name?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_id?: string | null
          org_id: string
          os_version?: string | null
          platform: string
          push_provider?: string | null
          push_token?: string | null
          settings?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string | null
          device_id?: string
          device_name?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_id?: string | null
          org_id?: string
          os_version?: string | null
          platform?: string
          push_provider?: string | null
          push_token?: string | null
          settings?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_groups_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          accent: string
          email_assignment_notifications: boolean
          email_release_notifications: boolean
          email_run_notifications: boolean
          id: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accent?: string
          email_assignment_notifications?: boolean
          email_release_notifications?: boolean
          email_run_notifications?: boolean
          id?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accent?: string
          email_assignment_notifications?: boolean
          email_release_notifications?: boolean
          email_run_notifications?: boolean
          id?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_test_defaults: {
        Row: {
          created_at: string | null
          id: string
          test_address: string | null
          test_company: string | null
          test_email: string | null
          test_name: string | null
          test_password: string | null
          test_phone: string | null
          test_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          test_address?: string | null
          test_company?: string | null
          test_email?: string | null
          test_name?: string | null
          test_password?: string | null
          test_phone?: string | null
          test_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          test_address?: string | null
          test_company?: string | null
          test_email?: string | null
          test_name?: string | null
          test_password?: string | null
          test_phone?: string | null
          test_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_test_defaults_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_test_devices: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          is_default: boolean | null
          name: string
          sort_order: number | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          is_default?: boolean | null
          name: string
          sort_order?: number | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          is_default?: boolean | null
          name?: string
          sort_order?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          clerk_user_id: string
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          is_billing_owner: boolean | null
          is_lead: boolean
          org_id: string | null
          updated_at: string | null
        }
        Insert: {
          clerk_user_id: string
          created_at?: string | null
          display_name?: string | null
          email: string
          id?: string
          is_billing_owner?: boolean | null
          is_lead?: boolean
          org_id?: string | null
          updated_at?: string | null
        }
        Update: {
          clerk_user_id?: string
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          is_billing_owner?: boolean | null
          is_lead?: boolean
          org_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_number: number
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          event: string
          http_status: number | null
          id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          status: string
          subscription_id: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          event: string
          http_status?: number | null
          id?: string
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          status?: string
          subscription_id: string
        }
        Update: {
          attempt_number?: number
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          event?: string
          http_status?: number | null
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "webhook_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_subscriptions: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          events: string[]
          id: string
          org_id: string
          secret: string
          status: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          events?: string[]
          id?: string
          org_id: string
          secret: string
          status?: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          events?: string[]
          id?: string
          org_id?: string
          secret?: string
          status?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_test_run_counts_by_build: {
        Args: { p_build_ids: string[] }
        Returns: {
          build_id: string
          run_count: number
        }[]
      }
      active_test_run_counts_by_release: {
        Args: { p_project_id: string }
        Returns: {
          release_id: string
          run_count: number
        }[]
      }
      get_current_clerk_user_id: { Args: never; Returns: string }
      get_org_api_quota: { Args: { org_uuid: string }; Returns: number }
      is_project_member: { Args: { project_uuid: string }; Returns: boolean }
      org_member_effective_roles: {
        Args: { p_org_id: string }
        Returns: {
          clerk_user_id: string
          system_role_key: string
        }[]
      }
      recent_builds_per_release: {
        Args: { p_limit?: number; p_release_ids: string[] }
        Returns: {
          created_at: string
          description: string
          end_date: string
          id: string
          name: string
          release_id: string
          start_date: string
          status: string
        }[]
      }
      release_execution_status_counts: {
        Args: { p_release_id: string }
        Returns: {
          effective_status: string
          status_count: number
        }[]
      }
      set_config: { Args: { key: string; value: string }; Returns: undefined }
      test_run_counts_by_build: {
        Args: { p_build_ids: string[] }
        Returns: {
          build_id: string
          run_count: number
        }[]
      }
      test_run_result_summaries: {
        Args: { p_run_ids: string[] }
        Returns: {
          blocked_count: number
          fail_count: number
          pass_count: number
          run_id: string
          skipped_count: number
          total_count: number
        }[]
      }
      user_belongs_to_org: { Args: { org_uuid: string }; Returns: boolean }
    }
    Enums: {
      build_source: "manual" | "bitbucket_webhook" | "api" | "cli"
      cicd_provider:
        | "github"
        | "gitlab"
        | "jenkins"
        | "azure_devops"
        | "circleci"
        | "bitbucket"
      user_role: "owner" | "admin" | "tester" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      build_source: ["manual", "bitbucket_webhook", "api", "cli"],
      cicd_provider: [
        "github",
        "gitlab",
        "jenkins",
        "azure_devops",
        "circleci",
        "bitbucket",
      ],
      user_role: ["owner", "admin", "tester", "viewer"],
    },
  },
} as const
