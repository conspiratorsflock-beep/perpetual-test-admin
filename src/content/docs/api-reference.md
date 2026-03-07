# API Reference

## Server Actions

All admin functions are available as Server Actions that can be imported from `@/lib/actions/*`.

### Users

```typescript
import { searchUsers, getUserById, deleteUser, toggleUserAdmin } from "@/lib/actions/users";

// Search users
const { users, total } = await searchUsers({ query: "john", limit: 50 });

// Get single user
const user = await getUserById("user_xxx");

// Toggle admin status
await toggleUserAdmin("user_xxx", true);

// Delete user
await deleteUser("user_xxx");
```

### Organizations

```typescript
import { searchOrganizations, getOrganizationById, changeOrgTier } from "@/lib/actions/organizations";

// Search orgs
const { orgs, total } = await searchOrganizations({ query: "acme" });

// Change tier
await changeOrgTier("org_xxx", "pro", "Upgrade requested by customer");
```

### Feature Flags

```typescript
import { getFeatureFlags, createFeatureFlag, toggleFeatureFlagGlobal } from "@/lib/actions/feature-flags";

// Create flag
await createFeatureFlag({
  key: "beta_feature",
  name: "Beta Feature",
  description: "New beta functionality"
});

// Toggle globally
await toggleFeatureFlagGlobal("flag_id", true);
```

### Billing

```typescript
import { getBillingMetrics, getRecentInvoices } from "@/lib/actions/billing";

// Get metrics
const metrics = await getBillingMetrics();
// Returns: { mrr, arr, activeSubscriptions, churnRate, ... }

// Get invoices
const invoices = await getRecentInvoices(10);
```

### Audit Logs

```typescript
import { getAuditLogs } from "@/lib/audit/logger";

// Get logs with filters
const { logs, count } = await getAuditLogs({
  targetType: "user",
  limit: 100
});
```

### API Usage

```typescript
import { getApiCallsToday, getApiUsageHistory } from "@/lib/actions/api-usage";

// Today's calls
const count = await getApiCallsToday();

// History
const history = await getApiUsageHistory(7);
```

### System Health

```typescript
import { runHealthChecks, getLatestHealthStatus } from "@/lib/actions/system-health";

// Run checks
const results = await runHealthChecks();

// Get latest
const status = await getLatestHealthStatus();
```

## Database Functions

### is_feature_enabled

```sql
SELECT is_feature_enabled(
  flag_key TEXT,
  user_id TEXT DEFAULT NULL,
  org_id TEXT DEFAULT NULL
) RETURNS BOOLEAN;
```

### increment_api_calls

```sql
SELECT increment_api_calls(
  p_endpoint TEXT DEFAULT NULL,
  p_status_code INTEGER DEFAULT NULL,
  p_user_id TEXT DEFAULT NULL,
  p_org_id TEXT DEFAULT NULL
);
```

## Webhooks

### Stripe Webhooks

Configure Stripe webhook endpoint:
- URL: `https://your-admin-url.com/api/webhooks/stripe`
- Events: `invoice.created`, `invoice.paid`, `customer.subscription.updated`

### Clerk Webhooks

Configure Clerk webhook endpoint:
- URL: `https://your-admin-url.com/api/webhooks/clerk`
- Events: `user.created`, `user.deleted`, `organization.created`
