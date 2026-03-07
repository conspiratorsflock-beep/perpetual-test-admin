# Feature Flags

## Overview

Feature flags allow you to control feature rollouts, run A/B tests, and manage beta access without deploying code.

## How It Works

### Global Enable
When a flag is enabled globally, all users have access to the feature.

### Organization Targeting
Enable a flag for specific organizations by adding their Clerk org ID to `enabledForOrgs`.

### User Targeting
Enable a flag for specific users by adding their Clerk user ID to `enabledForUsers`.

## Creating a Feature Flag

1. Go to **Support > Feature Flags**
2. Click **New Flag**
3. Enter:
   - **Key**: Machine-readable identifier (e.g., `new_dashboard`)
   - **Name**: Human-readable name (e.g., "New Dashboard UI")
   - **Description**: What the flag controls
4. Click **Create**

## Enabling Flags

### For Everyone
Toggle the **Global** switch to enable for all users.

### For Specific Orgs/Users
Use the database or API to add IDs to the flag's targeting arrays.

## Checking Flags in Your App

Use the `is_feature_enabled` SQL function:

```sql
SELECT is_feature_enabled('new_dashboard', 'user_id', 'org_id');
```

Or use the server action:

```typescript
import { checkFeatureEnabled } from "@/lib/actions/feature-flags";

const isEnabled = await checkFeatureEnabled("new_dashboard", userId, orgId);
```

## Best Practices

1. **Name consistently**: Use `snake_case` for keys
2. **Document**: Add clear descriptions
3. **Clean up**: Delete flags after full rollout
4. **Test**: Verify flags work before enabling globally

## Default Flags

The system seeds these flags on setup:
- `new_dashboard` - Beta dashboard UI
- `api_v2` - New API endpoints
- `advanced_analytics` - Enhanced reporting
- `team_collaboration` - Multi-user features
