## Table `organizations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `slug` | `text` |  Nullable Unique |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `clerk_org_id` | `text` |  Nullable Unique |
| `stripe_customer_id` | `text` |  Nullable |
| `stripe_subscription_id` | `text` |  Nullable |
| `lead_count` | `int4` |  |
| `tester_count` | `int4` |  |
| `trial_started_at` | `timestamptz` |  Nullable |
| `trial_ends_at` | `timestamptz` |  Nullable |
| `trial_lock_state` | `text` |  |
| `trial_extension_used` | `bool` |  Nullable |
| `trial_warning_sent_at` | `timestamptz` |  Nullable |
| `trial_soft_lock_sent_at` | `timestamptz` |  Nullable |
| `trial_hard_lock_sent_at` | `timestamptz` |  Nullable |
| `stripe_price_id` | `text` |  Nullable |
| `api_monthly_quota` | `int4` |  Nullable |

## Table `users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `clerk_user_id` | `text` |  Unique |
| `org_id` | `uuid` |  Nullable |
| `email` | `text` |  |
| `display_name` | `text` |  Nullable |
| `is_billing_owner` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `is_lead` | `bool` |  |

## Table `projects`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `jira_project_key` | `text` |  Nullable |
| `jira_site_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `deleted_at` | `timestamptz` |  Nullable |
| `project_code` | `varchar` |  Nullable |
| `bitbucket_repo_url` | `text` |  Nullable |
| `requirements_enabled` | `bool` |  |
| `weekly_report_enabled` | `bool` |  |
| `created_by` | `uuid` |  Nullable |

## Table `sections`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `deleted_at` | `timestamptz` |  Nullable |
| `parent_section_id` | `uuid` |  Nullable |
| `created_by` | `uuid` |  Nullable |

## Table `test_cases`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `section_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `priority` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `steps` | `jsonb` |  Nullable |
| `is_adhoc` | `bool` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `deleted_at` | `timestamptz` |  Nullable |
| `tc_sequence_number` | `int4` |  Nullable |
| `preconditions` | `text` |  Nullable |
| `external_id` | `text` |  Nullable |
| `automation_status` | `text` |  Nullable |
| `execution_mode` | `text` |  Nullable |
| `version` | `int4` |  Nullable |
| `is_latest_version` | `bool` |  Nullable |
| `previous_version_id` | `uuid` |  Nullable |
| `version_notes` | `text` |  Nullable |
| `test_case_type` | `text` |  Nullable |
| `gherkin_content` | `text` |  Nullable |
| `gherkin_scenario_type` | `text` |  Nullable |

## Table `test_runs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `release_id` | `uuid` |  Nullable |
| `build_id` | `uuid` |  Nullable |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `environment` | `text` |  Nullable |
| `custom_environment` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `inheritance_policy` | `text` |  Nullable |
| `parent_run_id` | `uuid` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `started_at` | `timestamptz` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `run_sequence_number` | `int4` |  Nullable |
| `configuration_count` | `int4` |  Nullable |
| `tested_on_device_id` | `uuid` |  Nullable |
| `tested_on_snapshot` | `text` |  Nullable |
| `environment_id` | `uuid` |  Nullable |
| `environment_snapshot` | `text` |  Nullable |

## Table `test_case_executions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `run_id` | `uuid` |  |
| `test_case_id` | `uuid` |  |
| `result` | `text` |  Nullable |
| `comments` | `text` |  Nullable |
| `executed_by` | `uuid` |  Nullable |
| `executed_at` | `timestamptz` |  Nullable |
| `effective_status` | `text` |  Nullable |
| `inherited_build_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `jira_push_status` | `text` |  Nullable |
| `jira_issue_key` | `text` |  Nullable |
| `jira_issue_url` | `text` |  Nullable |
| `jira_pushed_at` | `timestamptz` |  Nullable |
| `assigned_to` | `uuid` |  Nullable |
| `requires_retest` | `bool` |  |
| `manually_verified_safe` | `bool` |  |
| `inherited_from` | `uuid` |  Nullable |
| `inheritance_reason` | `text` |  Nullable |
| `verified_in_build_id` | `uuid` |  Nullable |
| `synced_at` | `timestamptz` |  Nullable |
| `sync_device_id` | `uuid` |  Nullable |
| `resolved_steps` | `jsonb` |  Nullable |

## Table `releases`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `target_date` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `deleted_at` | `timestamptz` |  Nullable |
| `pinned_build_id` | `uuid` |  Nullable |

## Table `builds`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `release_id` | `uuid` |  Nullable |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `start_date` | `timestamptz` |  Nullable |
| `end_date` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `source` | `build_source` |  Nullable |
| `source_metadata` | `jsonb` |  Nullable |
| `api_key_id` | `uuid` |  Nullable |
| `cicd_provider` | `cicd_provider` |  Nullable |
| `cicd_external_id` | `text` |  Nullable |
| `cicd_run_url` | `text` |  Nullable |
| `cicd_artifacts` | `jsonb` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `updated_by` | `uuid` |  Nullable |
| `deleted_at` | `timestamptz` |  Nullable |
| `jira_version_id` | `text` |  Nullable |

## Table `project_members`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `clerk_user_id` | `text` |  |
| `email` | `text` |  |
| `display_name` | `text` |  Nullable |
| `joined_at` | `timestamptz` |  Nullable |
| `custom_role_id` | `uuid` |  Nullable |
| `assigned_via_group_id` | `uuid` |  Nullable |

## Table `api_key_usage`

Detailed API request logging for audit and rate limiting

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `api_key_id` | `uuid` |  |
| `org_id` | `uuid` |  |
| `endpoint` | `text` |  |
| `method` | `text` |  |
| `ip_address` | `inet` |  Nullable |
| `user_agent` | `text` |  Nullable |
| `status_code` | `int4` |  Nullable |
| `request_at` | `timestamptz` |  Nullable |
| `response_time_ms` | `int4` |  Nullable |
| `rate_limit_hit` | `bool` |  Nullable |

## Table `code_changes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `build_id` | `uuid` |  |
| `previous_build_id` | `uuid` |  Nullable |
| `files_changed` | `jsonb` |  |
| `features_affected` | `jsonb` |  |
| `test_cases_impacted` | `_uuid` |  |
| `breaking_change` | `bool` |  |
| `security_fix` | `bool` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `tags`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  Nullable |
| `name` | `text` |  |
| `color` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `project_id` | `uuid` |  Nullable |
| `category` | `varchar` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `archived_at` | `timestamptz` |  Nullable |
| `created_by` | `uuid` |  Nullable |

## Table `build_tags`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `build_id` | `uuid` | Primary |
| `tag_id` | `uuid` | Primary |

## Table `project_sprint_config`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `project_id` | `uuid` | Primary |
| `enabled` | `bool` |  |
| `length_weeks` | `int4` |  |
| `start_day_of_week` | `int4` |  |
| `first_sprint_number` | `int4` |  |
| `first_sprint_start_date` | `date` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `slack_connections`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  Unique |
| `webhook_url` | `text` |  |
| `channel_name` | `text` |  Nullable |
| `workspace_name` | `text` |  Nullable |
| `status` | `text` |  |
| `notify_run_submitted` | `bool` |  |
| `notify_run_completed` | `bool` |  |
| `notify_build_readiness` | `bool` |  |
| `last_used_at` | `timestamptz` |  Nullable |
| `error_message` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `created_by` | `uuid` |  Nullable |

## Table `test_case_tags`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `test_case_id` | `uuid` | Primary |
| `tag_id` | `uuid` | Primary |

## Table `section_tags`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `section_id` | `uuid` | Primary |
| `tag_id` | `uuid` | Primary |

## Table `test_case_jira_links`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `test_case_id` | `uuid` |  |
| `jira_issue_key` | `text` |  |
| `link_type` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `test_case_relations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `test_case_id` | `uuid` |  |
| `related_test_case_id` | `uuid` |  |
| `relationship_type` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `audit_logs`

Audit trail for all data changes across the application

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `org_id` | `uuid` |  Nullable |
| `project_id` | `uuid` |  Nullable |
| `action` | `text` |  |
| `resource_type` | `text` |  |
| `resource_id` | `text` |  |
| `old_value` | `jsonb` |  Nullable |
| `new_value` | `jsonb` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `cicd_connections`

CI/CD provider connections per project

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `provider` | `cicd_provider` |  |
| `external_id` | `text` |  Nullable |
| `webhook_secret` | `text` |  Nullable |
| `config` | `jsonb` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `webhook_url` | `text` |  Nullable Unique |
| `webhook_token` | `text` |  Nullable |
| `connected_by` | `uuid` |  Nullable |
| `connected_at` | `timestamptz` |  Nullable |
| `last_used_at` | `timestamptz` |  Nullable |
| `last_event_at` | `timestamptz` |  Nullable |
| `error_count` | `int4` |  Nullable |
| `error_message` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `cicd_webhook_events`

Audit log of incoming CI/CD webhooks

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `connection_id` | `uuid` |  |
| `provider` | `cicd_provider` |  |
| `event_type` | `text` |  |
| `external_run_id` | `text` |  Nullable |
| `payload` | `jsonb` |  Nullable |
| `payload_size` | `int4` |  Nullable |
| `status` | `text` |  Nullable |
| `processed_at` | `timestamptz` |  Nullable |
| `error_message` | `text` |  Nullable |
| `build_queue_item_id` | `uuid` |  Nullable |
| `build_id` | `uuid` |  Nullable |
| `test_run_id` | `uuid` |  Nullable |
| `received_at` | `timestamptz` |  Nullable |
| `ip_address` | `inet` |  Nullable |
| `user_agent` | `text` |  Nullable |

## Table `cicd_pipeline_configs`

Configuration for auto-processing CI/CD pipelines

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `connection_id` | `uuid` |  |
| `pipeline_name` | `text` |  |
| `pipeline_id` | `text` |  Nullable |
| `branch_pattern` | `text` |  Nullable |
| `auto_create_build` | `bool` |  Nullable |
| `auto_create_test_run` | `bool` |  Nullable |
| `auto_submit_results` | `bool` |  Nullable |
| `target_release_id` | `uuid` |  Nullable |
| `default_environment` | `text` |  Nullable |
| `result_artifact_path` | `text` |  Nullable |
| `result_format` | `text` |  Nullable |
| `inheritance_policy` | `text` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `configuration_groups`

Groups of test configurations (e.g., Browser, OS)

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `is_required` | `bool` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `configurations`

Individual configuration values (e.g., Chrome 120, Windows 11)

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `group_id` | `uuid` |  |
| `name` | `text` |  |
| `value` | `text` |  |
| `description` | `text` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `test_run_configurations`

Links test runs to their selected configurations

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `test_run_id` | `uuid` |  |
| `configuration_id` | `uuid` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `test_case_execution_configs`

Per-configuration test results when running with configurations

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `execution_id` | `uuid` |  |
| `configuration_id` | `uuid` |  |
| `result` | `text` |  Nullable |
| `executed_by` | `uuid` |  Nullable |
| `executed_at` | `timestamptz` |  Nullable |
| `duration_seconds` | `int4` |  Nullable |
| `comments` | `text` |  Nullable |
| `defect_refs` | `_text` |  Nullable |
| `effective_status` | `text` |  Nullable |
| `requires_retest` | `bool` |  Nullable |
| `manually_verified_safe` | `bool` |  Nullable |
| `inherited_from` | `uuid` |  Nullable |
| `inherited_build_id` | `uuid` |  Nullable |
| `inheritance_reason` | `text` |  Nullable |
| `verified_in_build_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `user_devices`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `text` |  |
| `org_id` | `uuid` |  |
| `device_id` | `text` |  |
| `device_name` | `text` |  Nullable |
| `platform` | `text` |  |
| `os_version` | `text` |  Nullable |
| `app_version` | `text` |  Nullable |
| `push_token` | `text` |  Nullable |
| `push_provider` | `text` |  Nullable |
| `last_sync_at` | `timestamptz` |  Nullable |
| `last_sync_id` | `text` |  Nullable |
| `settings` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `sync_operations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `sync_id` | `text` |  Unique |
| `device_id` | `uuid` |  |
| `user_id` | `text` |  |
| `org_id` | `uuid` |  |
| `direction` | `text` |  |
| `status` | `text` |  |
| `started_at` | `timestamptz` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |
| `since` | `timestamptz` |  Nullable |
| `changes_summary` | `jsonb` |  Nullable |
| `processed_count` | `int4` |  Nullable |
| `error_count` | `int4` |  Nullable |
| `conflict_count` | `int4` |  Nullable |
| `error_message` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `sync_pending_changes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `device_id` | `uuid` |  |
| `user_id` | `text` |  |
| `org_id` | `uuid` |  |
| `table_name` | `text` |  |
| `record_id` | `text` |  |
| `action` | `text` |  |
| `data` | `jsonb` |  |
| `client_timestamp` | `timestamptz` |  |
| `local_id` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `server_record_id` | `text` |  Nullable |
| `error_message` | `text` |  Nullable |
| `conflict_resolved_at` | `timestamptz` |  Nullable |
| `conflict_resolution` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `processed_at` | `timestamptz` |  Nullable |

## Table `sync_conflicts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `device_id` | `uuid` |  |
| `user_id` | `text` |  |
| `org_id` | `uuid` |  |
| `table_name` | `text` |  |
| `record_id` | `text` |  |
| `server_data` | `jsonb` |  |
| `client_data` | `jsonb` |  |
| `status` | `text` |  Nullable |
| `resolution` | `text` |  Nullable |
| `resolved_data` | `jsonb` |  Nullable |
| `resolved_at` | `timestamptz` |  Nullable |
| `resolved_by` | `text` |  Nullable |
| `detected_at` | `timestamptz` |  Nullable |
| `sync_id` | `text` |  Nullable |

## Table `attachment_upload_sessions`

Attachment upload sessions expire after 1 hour. Clean up expired sessions with: DELETE FROM attachment_upload_sessions WHERE expires_at < NOW()

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `text` |  |
| `org_id` | `uuid` |  |
| `device_id` | `uuid` |  Nullable |
| `filename` | `text` |  |
| `content_type` | `text` |  |
| `size_bytes` | `int4` |  |
| `storage_key` | `text` |  Nullable |
| `storage_provider` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `attachment_id` | `uuid` |  Nullable |
| `execution_id` | `uuid` |  Nullable |
| `upload_url` | `text` |  Nullable |
| `upload_url_expires_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |
| `expires_at` | `timestamptz` |  Nullable |

## Table `test_case_version_history`

Audit trail of all changes to test cases

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `test_case_id` | `uuid` |  |
| `version` | `int4` |  |
| `changed_by` | `uuid` |  Nullable |
| `changed_at` | `timestamptz` |  Nullable |
| `change_type` | `text` |  |
| `change_summary` | `text` |  Nullable |
| `title_snapshot` | `text` |  Nullable |
| `description_snapshot` | `text` |  Nullable |
| `steps_snapshot` | `jsonb` |  Nullable |
| `preconditions_snapshot` | `text` |  Nullable |
| `priority_snapshot` | `text` |  Nullable |
| `status_snapshot` | `text` |  Nullable |
| `gherkin_content_snapshot` | `text` |  Nullable |
| `field_diff` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `test_run_baselines`

Records which test case version was used in each test run

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `test_run_id` | `uuid` |  |
| `test_case_id` | `uuid` |  |
| `version_used` | `int4` |  |
| `title_snapshot` | `text` |  Nullable |
| `steps_snapshot` | `jsonb` |  Nullable |
| `preconditions_snapshot` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `gherkin_examples`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `test_case_id` | `uuid` |  |
| `table_name` | `text` |  |
| `headers` | `_text` |  |
| `rows` | `jsonb` |  |
| `sort_order` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `gherkin_tags`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `test_case_id` | `uuid` |  |
| `tag` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `jira_connections`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `text` |  Unique |
| `jira_site_url` | `text` |  |
| `jira_site_name` | `text` |  |
| `jira_user_email` | `text` |  |
| `access_token` | `text` |  |
| `refresh_token` | `text` |  |
| `token_expires_at` | `timestamptz` |  |
| `scopes` | `_text` |  Nullable |
| `status` | `text` |  |
| `last_synced_at` | `timestamptz` |  Nullable |
| `error_message` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `jira_project_configs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  Unique |
| `jira_project_key` | `text` |  |
| `jira_project_id` | `text` |  |
| `jira_project_name` | `text` |  |
| `default_issue_type` | `text` |  |
| `issue_type_id` | `text` |  |
| `priority_mappings` | `jsonb` |  Nullable |
| `default_labels` | `_text` |  Nullable |
| `custom_fields` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `jira_field_mappings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `config_id` | `uuid` |  |
| `pt_field` | `text` |  |
| `jira_field_id` | `text` |  |
| `jira_field_name` | `text` |  |
| `transformation` | `text` |  |
| `template` | `text` |  Nullable |
| `order` | `int4` |  |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `jira_push_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `text` |  |
| `project_id` | `uuid` |  |
| `execution_id` | `uuid` |  |
| `test_case_id` | `uuid` |  |
| `run_id` | `uuid` |  |
| `build_id` | `uuid` |  Nullable |
| `pushed_by` | `uuid` |  Nullable |
| `pushed_at` | `timestamptz` |  |
| `jira_issue_key` | `text` |  |
| `jira_issue_id` | `text` |  |
| `jira_issue_url` | `text` |  |
| `title_snapshot` | `text` |  |
| `description_snapshot` | `text` |  |
| `steps_snapshot` | `jsonb` |  |
| `result_snapshot` | `text` |  |
| `notes_snapshot` | `text` |  Nullable |
| `attachments_snapshot` | `jsonb` |  |
| `status` | `text` |  |
| `error_message` | `text` |  Nullable |
| `retry_count` | `int4` |  |
| `last_synced_at` | `timestamptz` |  Nullable |
| `jira_status` | `text` |  Nullable |
| `jira_resolution` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `jira_priority` | `text` |  Nullable |

## Table `admin_announcements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `message` | `text` |  |
| `style` | `text` |  |
| `tier` | `text` |  |
| `link_url` | `text` |  Nullable |
| `link_text` | `text` |  Nullable |
| `starts_at` | `timestamptz` |  |
| `ends_at` | `timestamptz` |  Nullable |
| `org_id` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `created_by` | `text` |  |

## Table `teams_connections`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  Unique |
| `webhook_url` | `text` |  |
| `team_name` | `text` |  Nullable |
| `channel_name` | `text` |  Nullable |
| `tenant_name` | `text` |  Nullable |
| `notify_run_submitted` | `bool` |  Nullable |
| `notify_run_completed` | `bool` |  Nullable |
| `notify_build_readiness` | `bool` |  Nullable |
| `status` | `text` |  Nullable |
| `last_used_at` | `timestamptz` |  Nullable |
| `error_message` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `azure_devops_connections`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  Unique |
| `access_token` | `text` |  |
| `refresh_token` | `text` |  Nullable |
| `token_expires_at` | `timestamptz` |  Nullable |
| `ado_org_url` | `text` |  |
| `ado_org_name` | `text` |  Nullable |
| `ado_user_email` | `text` |  Nullable |
| `sync_projects` | `bool` |  Nullable |
| `sync_work_items` | `bool` |  Nullable |
| `sync_builds` | `bool` |  Nullable |
| `status` | `text` |  Nullable |
| `last_synced_at` | `timestamptz` |  Nullable |
| `error_message` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `azure_devops_project_mappings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `connection_id` | `uuid` |  Nullable |
| `pt_project_id` | `uuid` |  Nullable |
| `ado_project_id` | `text` |  |
| `ado_project_name` | `text` |  Nullable |
| `sync_test_cases` | `bool` |  Nullable |
| `sync_bugs` | `bool` |  Nullable |
| `default_work_item_type` | `text` |  Nullable |
| `ado_subscription_id` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `azure_devops_webhook_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `connection_id` | `uuid` |  Nullable |
| `event_type` | `text` |  |
| `event_id` | `text` |  Nullable |
| `payload` | `jsonb` |  Nullable |
| `processed` | `bool` |  Nullable |
| `processed_at` | `timestamptz` |  Nullable |
| `error_message` | `text` |  Nullable |
| `received_at` | `timestamptz` |  Nullable |

## Table `support_tickets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `ticket_number` | `int4` |  Unique |
| `user_id` | `text` |  |
| `user_email` | `text` |  Nullable |
| `user_name` | `text` |  Nullable |
| `org_id` | `text` |  Nullable |
| `subject` | `text` |  |
| `description` | `text` |  |
| `category` | `text` |  |
| `priority` | `text` |  |
| `status` | `text` |  |
| `source` | `text` |  |
| `assigned_to` | `text` |  Nullable |
| `browser_info` | `text` |  Nullable |
| `os_info` | `text` |  Nullable |
| `app_version` | `text` |  Nullable |
| `sla_deadline` | `timestamptz` |  Nullable |
| `resolved_at` | `timestamptz` |  Nullable |
| `closed_at` | `timestamptz` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `support_ticket_comments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `ticket_id` | `uuid` |  |
| `author_id` | `text` |  |
| `author_name` | `text` |  Nullable |
| `author_email` | `text` |  Nullable |
| `content` | `text` |  |
| `is_internal` | `bool` |  Nullable |
| `is_edited` | `bool` |  Nullable |
| `edited_at` | `timestamptz` |  Nullable |
| `attachments` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `support_ticket_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `ticket_id` | `uuid` |  |
| `event_type` | `text` |  |
| `performed_by` | `text` |  |
| `performed_by_name` | `text` |  Nullable |
| `old_value` | `text` |  Nullable |
| `new_value` | `text` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `support_canned_responses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `title` | `text` |  |
| `content` | `text` |  |
| `category` | `text` |  Nullable |
| `tags` | `_text` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `support_team_members`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `text` |  Unique |
| `email` | `text` |  |
| `name` | `text` |  Nullable |
| `role` | `text` |  |
| `skills` | `_text` |  Nullable |
| `max_open_tickets` | `int4` |  Nullable |
| `is_available` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `support_sla_config`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `priority` | `text` |  Unique |
| `first_response_hours` | `int4` |  |
| `resolution_hours` | `int4` |  Nullable |
| `business_hours_only` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `requirements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `external_id` | `text` |  Nullable |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `source` | `text` |  |
| `status` | `text` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `release_requirements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `release_id` | `uuid` | Primary |
| `requirement_id` | `uuid` | Primary |
| `added_at` | `timestamptz` |  |
| `added_by` | `uuid` |  Nullable |

## Table `build_requirements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `build_id` | `uuid` | Primary |
| `requirement_id` | `uuid` | Primary |
| `added_at` | `timestamptz` |  |
| `added_by` | `uuid` |  Nullable |

## Table `test_run_requirements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `test_run_id` | `uuid` | Primary |
| `requirement_id` | `uuid` | Primary |
| `added_at` | `timestamptz` |  |
| `added_by` | `uuid` |  Nullable |

## Table `api_keys`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `project_id` | `uuid` |  Nullable |
| `name` | `varchar` |  |
| `key_hash` | `varchar` |  Unique |
| `key_prefix` | `varchar` |  |
| `scopes` | `_text` |  |
| `rate_limit_per_minute` | `int4` |  |
| `last_used_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `created_by` | `uuid` |  Nullable |
| `expires_at` | `timestamptz` |  Nullable |
| `revoked_at` | `timestamptz` |  Nullable |
| `monthly_quota_override` | `int4` |  Nullable |
| `monthly_usage` | `int4` |  |

## Table `build_queue`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `project_id` | `uuid` |  Nullable |
| `name` | `varchar` |  |
| `build_number` | `varchar` |  Nullable |
| `commit_sha` | `varchar` |  Nullable |
| `branch` | `varchar` |  Nullable |
| `repo_url` | `text` |  Nullable |
| `source` | `varchar` |  |
| `api_key_id` | `uuid` |  Nullable |
| `status` | `varchar` |  |
| `assigned_to_user_id` | `uuid` |  Nullable |
| `assigned_at` | `timestamptz` |  Nullable |
| `assigned_release_id` | `uuid` |  Nullable |
| `metadata` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `api_usage_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `api_key_id` | `uuid` |  Nullable |
| `org_id` | `uuid` |  Nullable |
| `endpoint` | `text` |  |
| `method` | `varchar` |  |
| `status_code` | `int4` |  Nullable |
| `response_time_ms` | `int4` |  Nullable |
| `error` | `bool` |  Nullable |
| `error_message` | `text` |  Nullable |
| `ip_address` | `inet` |  Nullable |
| `user_agent` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `integration_notification_rules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `project_id` | `uuid` |  Nullable |
| `trigger_event` | `text` |  |
| `label` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `created_by` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `integration_notification_destinations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `rule_id` | `uuid` |  |
| `destination_type` | `text` |  |
| `connection_id` | `uuid` |  Nullable |
| `channel_id` | `text` |  |
| `channel_name` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `integration_event_log`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `project_id` | `uuid` |  Nullable |
| `rule_id` | `uuid` |  Nullable |
| `event_type` | `text` |  |
| `source` | `text` |  |
| `status` | `text` |  |
| `entity_type` | `text` |  Nullable |
| `entity_id` | `uuid` |  Nullable |
| `payload` | `jsonb` |  Nullable |
| `error_message` | `text` |  Nullable |
| `destination_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `pending_org_invitations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `email` | `text` |  |
| `clerk_invitation_id` | `text` |  Nullable |
| `org_role` | `text` |  |
| `project_role` | `text` |  |
| `add_to_all_projects` | `bool` |  |
| `project_ids` | `_uuid` |  Nullable |
| `invited_by` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |
| `accepted_at` | `timestamptz` |  Nullable |

## Table `organization_variables`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `organization_id` | `uuid` |  |
| `name` | `text` |  |
| `type` | `text` |  |
| `subtype` | `text` |  Nullable |
| `value` | `text` |  Nullable |
| `config` | `jsonb` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `project_variables`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `name` | `text` |  |
| `type` | `text` |  |
| `subtype` | `text` |  Nullable |
| `value` | `text` |  Nullable |
| `config` | `jsonb` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `user_test_defaults`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Unique |
| `test_email` | `text` |  Nullable |
| `test_password` | `text` |  Nullable |
| `test_name` | `text` |  Nullable |
| `test_phone` | `text` |  Nullable |
| `test_url` | `text` |  Nullable |
| `test_company` | `text` |  Nullable |
| `test_address` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `execution_variables`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `execution_id` | `uuid` |  |
| `variable_name` | `text` |  |
| `resolved_value` | `text` |  |
| `source` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `org_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  Unique |
| `feature_requirements_enabled` | `bool` |  |
| `require_2fa` | `bool` |  |
| `session_timeout_minutes` | `int4` |  |
| `default_notification_channel` | `text` |  |
| `notify_on_run_complete` | `bool` |  |
| `notify_on_build_status_change` | `bool` |  |
| `default_inheritance_policy` | `text` |  |
| `default_coverage_target_pct` | `int4` |  |
| `default_environment` | `text` |  |
| `updated_at` | `timestamptz` |  |

## Table `test_case_templates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `preconditions` | `text` |  Nullable |
| `priority` | `text` |  |
| `steps` | `jsonb` |  |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `project_report_subscribers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `email` | `text` |  |
| `added_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `user_test_devices`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `text` |  |
| `name` | `text` |  |
| `type` | `text` |  |
| `details` | `jsonb` |  Nullable |
| `is_default` | `bool` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `project_environments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `name` | `text` |  |
| `color` | `text` |  Nullable |
| `is_default` | `bool` |  Nullable |
| `sort_order` | `int4` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `permissions`

Canonical catalog of every permission in the application

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `resource` | `text` |  |
| `action` | `text` |  |
| `level` | `text` |  |
| `description` | `text` |  Nullable |
| `is_restricted` | `bool` |  |

## Table `custom_roles`

Org-level roles. System roles are seeded per org and immutable.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `template_role` | `text` |  Nullable |
| `is_system` | `bool` |  |
| `system_role_key` | `text` |  Nullable |
| `created_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `role_permissions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `role_id` | `uuid` | Primary |
| `permission_id` | `text` | Primary |

## Table `user_groups`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `created_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `group_memberships`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `group_id` | `uuid` | Primary |
| `clerk_user_id` | `text` | Primary |
| `joined_at` | `timestamptz` |  Nullable |

## Table `project_group_access`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `project_id` | `uuid` |  |
| `group_id` | `uuid` |  |
| `role_id` | `uuid` |  |
| `assigned_by` | `text` |  Nullable |
| `assigned_at` | `timestamptz` |  Nullable |

## Table `org_api_usage`

Monthly rollup of API usage per organization. Reset by cron on the 1st of each month.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `uuid` |  |
| `year_month` | `text` |  |
| `total_calls` | `int4` |  |
| `quota` | `int4` |  |
| `overage_count` | `int4` |  |
| `warning_80_sent_at` | `timestamptz` |  Nullable |
| `warning_100_sent_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `webhook_subscriptions`

Outgoing webhook subscriptions for the API platform

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `org_id` | `text` |  |
| `url` | `text` |  |
| `secret` | `text` |  |
| `events` | `_text` |  |
| `status` | `text` |  |
| `description` | `text` |  Nullable |
| `created_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `webhook_deliveries`

Delivery log for webhook events

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `subscription_id` | `uuid` |  |
| `event` | `text` |  |
| `payload` | `jsonb` |  |
| `status` | `text` |  |
| `http_status` | `int4` |  Nullable |
| `response_body` | `text` |  Nullable |
| `error_message` | `text` |  Nullable |
| `attempt_number` | `int4` |  |
| `next_retry_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `delivered_at` | `timestamptz` |  Nullable |

## Table `user_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Unique |
| `theme` | `text` |  |
| `accent` | `text` |  |
| `email_run_notifications` | `bool` |  |
| `email_assignment_notifications` | `bool` |  |
| `email_release_notifications` | `bool` |  |
| `updated_at` | `timestamptz` |  |

## Table `stripe_webhook_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `event_id` | `text` | Primary |
| `event_type` | `text` |  |
| `received_at` | `timestamptz` |  |

## Table `release_report_runs`

Junction: which test runs are included in a release report

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `release_id` | `uuid` | Primary |
| `run_id` | `uuid` | Primary |
| `pinned_by` | `uuid` |  Nullable |
| `pinned_at` | `timestamptz` |  |

## Table `release_report_executions`

Junction: which individual executions count in a release report

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `release_id` | `uuid` | Primary |
| `execution_id` | `uuid` | Primary |
| `pinned_by` | `uuid` |  Nullable |
| `pinned_at` | `timestamptz` |  |

## Table `support_ticket_links`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `ticket_id` | `uuid` |  |
| `resource_type` | `text` |  |
| `resource_id` | `text` |  |
| `resource_name` | `text` |  Nullable |
| `resource_url` | `text` |  Nullable |
| `created_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

