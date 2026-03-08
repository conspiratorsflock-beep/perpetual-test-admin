# Help Desk Ticket System - Setup & Integration Guide

## Overview

A complete support ticket system has been added to the admin console. This document covers:
1. Database schema
2. Admin UI features
3. Integration guide for the main app

---

## Database Schema

Run the migration file to create the support ticket tables:

```bash
# If using Supabase CLI
supabase db push

# Or run the SQL file directly
psql $DATABASE_URL -f supabase/migrations/20260311_support_tickets.sql
```

### Tables Created

#### 1. `support_tickets`
Main ticket table with:
- Auto-incrementing ticket numbers
- User info (captured at creation)
- Status workflow: `open` → `pending`/`in_progress` → `resolved` → `closed`
- Priority levels: `low`, `medium`, `high`, `urgent`
- SLA tracking with deadlines
- Assignment tracking
- System context (browser, OS, app version)

#### 2. `support_ticket_comments`
Conversation threads:
- Public replies and internal notes
- Attachment support (JSONB array)
- Edit tracking

#### 3. `support_ticket_events`
Audit trail for all ticket changes

#### 4. `support_canned_responses`
Pre-written responses for agents

#### 5. `support_team_members`
Team configuration with:
- Role-based access (admin/agent/viewer)
- Workload limits
- Skills for auto-routing
- Availability status

#### 6. `support_sla_config`
SLA rules by priority level

---

## Admin UI Features

Navigate to `/help-desk` to access:

### Ticket Queue
- Filter by status (open, pending, in_progress, resolved, closed, escalated)
- View unassigned tickets
- Search by subject, description, or user email
- Quick stats dashboard
- Overdue ticket highlighting

### Ticket Detail View
- Full conversation history
- Reply with public or internal notes
- Status changes
- Assignment management
- Priority adjustment
- SLA tracking
- System info display

### Team Management
- View team members
- Add/remove agents
- Configure skills and workload

### Canned Responses
- Pre-written response library
- Quick copy to clipboard

### Analytics
- Ticket volume by status/category
- Response time metrics
- CSAT scores (placeholder)

---

## Main App Integration

### API for Creating Tickets

Create a new API route in the main app:

```typescript
// app/api/support/tickets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: body.userId,
        user_email: body.userEmail,
        user_name: body.userName,
        org_id: body.orgId,
        subject: body.subject,
        description: body.description,
        category: body.category,
        source: "web", // or "in_app"
        browser_info: body.browserInfo,
        os_info: body.osInfo,
        app_version: body.appVersion,
      })
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ ticket: data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 }
    );
  }
}
```

### React Component for Ticket Submission

```typescript
// components/support/CreateTicketForm.tsx
"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";

interface CreateTicketFormProps {
  onSuccess?: (ticketNumber: number) => void;
}

export function CreateTicketForm({ onSuccess }: CreateTicketFormProps) {
  const { user } = useUser();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("technical");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          userEmail: user?.primaryEmailAddress?.emailAddress,
          userName: user?.fullName,
          orgId: user?.organizationMemberships?.[0]?.organization.id,
          subject,
          description,
          category,
          browserInfo: navigator.userAgent,
          osInfo: navigator.platform,
          appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
        }),
      });

      const data = await response.json();
      
      if (data.ticket) {
        onSuccess?.(data.ticket.ticket_number);
        setSubject("");
        setDescription("");
      }
    } catch (error) {
      console.error("Failed to create ticket:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </div>
      
      <div>
        <label>Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="billing">Billing</option>
          <option value="account">Account</option>
          <option value="technical">Technical</option>
          <option value="feature_request">Feature Request</option>
          <option value="bug_report">Bug Report</option>
          <option value="question">Question</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      <div>
        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          required
        />
      </div>
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Ticket"}
      </button>
    </form>
  );
}
```

### Ticket Status Check Component

```typescript
// components/support/TicketStatus.tsx
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

export function TicketStatus() {
  const { user } = useUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    if (!user) return;
    
    // Fetch user's tickets
    fetch(`/api/support/tickets?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => setTickets(data.tickets || []));
  }, [user]);

  return (
    <div>
      <h2>Your Support Tickets</h2>
      {tickets.length === 0 ? (
        <p>No tickets yet</p>
      ) : (
        <ul>
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              #{ticket.ticket_number} - {ticket.subject} ({ticket.status})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## Auto-Priority Calculation

The database automatically calculates priority based on:
- **Urgent**: Keywords like "urgent", "critical", "down", "outage", "payment failed"
- **High**: Keywords like "important", "error", "bug" or billing/technical categories
- **Low**: Feature requests and questions without urgency keywords
- **Medium**: Default for everything else

---

## SLA Configuration

Default SLA times (first response):
- Urgent: 1 hour
- High: 4 hours
- Medium: 8 hours
- Low: 24 hours

Modify in `support_sla_config` table or add business hours logic.

---

## Webhook Integration (Optional)

For real-time notifications, set up webhooks:

```typescript
// When ticket is created/updated
const notifyWebhook = async (ticketId: string, event: string) => {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `New ticket #${ticketId}: ${event}`,
    }),
  });
};
```

---

## Security Notes

1. Use service role key only server-side
2. Validate user identity before creating tickets
3. Rate limit ticket creation per user
4. Sanitize HTML in descriptions if rendering rich text

---

## Next Steps

1. Run the database migration
2. Test the admin UI at `/help-desk`
3. Implement the ticket submission form in the main app
4. Set up email notifications (SendGrid/Resend)
5. Configure webhooks for Slack/Discord alerts
6. Train support team on canned responses
