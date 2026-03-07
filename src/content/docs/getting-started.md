# Getting Started

Welcome to the Perpetual Test Admin Console.

## Overview

This admin console provides tools for managing users, organizations, billing, and system configuration.

## Quick Links

- [User Management](/docs/user-management)
- [Organization Management](/docs/organization-management)
- [Feature Flags](/docs/feature-flags)
- [Billing](/docs/billing)

## Authentication

All admin actions require:
1. Valid Clerk session
2. `isAdmin: true` in user metadata

## Audit Logging

Every action is logged to `admin_audit_logs` table for compliance and debugging.
