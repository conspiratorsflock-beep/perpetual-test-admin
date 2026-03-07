# User Management

## Overview

The User Management section allows administrators to:

- Search and filter users
- View user details and activity
- Promote/revoke admin access
- Delete user accounts
- Generate impersonation tokens

## Impersonation

Impersonation allows admins to sign in as another user for debugging purposes.

### Security
- Tokens expire after 30 minutes
- Each token can only be used once
- All impersonation is logged

### Usage
1. Navigate to user detail page
2. Click "Impersonate" button
3. Copy the generated token
4. Use token in main app

## Admin Promotion

To promote a user to admin:
1. Go to user detail page
2. Click "Make Admin"
3. Confirm the action

Or use Clerk Dashboard directly to set `publicMetadata.isAdmin: true`.
