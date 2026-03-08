# Support Ticket System Plan

## Overview
A simple, user-friendly support ticket system integrated into the Perpetual Test platform.

## Goals
- **For Users**: Easy to submit, clear status tracking, minimal friction
- **For Support Team**: Efficient triage, context-rich tickets, collaboration tools
- **For Admins**: Analytics, SLA monitoring, team performance insights

---

## User Experience (Simple)

### Submitting a Ticket
```
┌─────────────────────────────────────────┐
│  Need Help?                             │
│                                         │
│  [I have a question about...]          │
│                                         │
│  Quick Topics:                          │
│  [Billing] [Account] [Bug] [Feature]   │
│                                         │
│  Or describe your issue:                │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Attach Screenshot]  [Submit Ticket]   │
└─────────────────────────────────────────┘
```

### User Ticket List
```
┌─────────────────────────────────────────┐
│  My Support Tickets                     │
│                                         │
│  • Billing question        [Open]       │
│    Last update: 2 hours ago             │
│                                         │
│  • Feature request         [Closed]     │
│    Resolved: 3 days ago                 │
│                                         │
└─────────────────────────────────────────┘
```

### Ticket Detail View (User)
```
┌─────────────────────────────────────────┐
│  #1234 - Billing Question    [Open]     │
│                                         │
│  Created: Jan 15, 2024                  │
│  Status: Awaiting your reply            │
│                                         │
│  ─────────────────────────────────────  │
│  Conversation:                          │
│                                         │
│  [You] Jan 15, 10:30 AM                 │
│  I was charged twice this month...      │
│                                         │
│  [Support] Jan 15, 11:45 AM             │
│  Hi! I can help with that. Could you    │
│  share your invoice number?             │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Reply...                        │   │
│  └─────────────────────────────────┘   │
│  [Send Reply]                           │
└─────────────────────────────────────────┘
```

---

## Admin/Agent Experience (Robust)

### Ticket Queue
```
┌─────────────────────────────────────────────────────────────┐
│  Support Queue                    [New Ticket] [Settings]   │
│                                                             │
│  Filters: [All] [Open] [Pending] [Urgent] [Unassigned]     │
│                                                             │
│  ┌────────┬─────────────┬──────────┬───────────┬─────────┐ │
│  │ Ticket │ Subject     │ User     │ Status    │ SLA     │ │
│  ├────────┼─────────────┼──────────┼───────────┼─────────┤ │
│  │ #1234  │ Billing...  │ john@... │ 🔴 Urgent │ 2h left │ │
│  │ #1233  │ Feature...  │ jane@... │ 🟡 Open   │ 1d left │ │
│  │ #1232  │ How do I... │ bob@...  │ 🟢 Pending│ 3d left │ │
│  └────────┴─────────────┴──────────┴───────────┴─────────┘ │
│                                                             │
│  Auto-suggest: 3 similar tickets found                      │
│  [View]                                                     │
└─────────────────────────────────────────────────────────────┘
```

### Agent Ticket View
```
┌─────────────────────────────────────────────────────────────┐
│  #1234  Billing Question - Double Charge          [Actions] │
│                                                             │
│  ┌────────────────────────┐  ┌──────────────────────────┐  │
│  │ CUSTOMER CONTEXT       │  │ CONVERSATION             │  │
│  │                        │  │                          │  │
│  │ John Doe               │  │ [Full threaded chat]     │  │
│  │ john@example.com       │  │                          │  │
│  │ Plan: Pro ($49/mo)     │  │ [Internal Notes]         │  │
│  │ Member since: Jan 2023 │  │ ┌────────────────────┐   │  │
│  │ Last login: 2 hrs ago  │  │ │ Only visible to    │   │  │
│  │                        │  │ │ support team       │   │  │
│  │ Recent Activity:       │  │ │                    │   │  │
│  │ • Invoice #123 paid    │  │ │ Customer seems     │   │  │
│  │ • Feature X used       │  │ │ frustrated. Prior  │   │  │
│  │   heavily              │  │ │ refund approved.   │   │  │
│  │                        │  │ └────────────────────┘   │  │
│  │ RELATED TICKETS:       │  │                          │  │
│  │ • #1198 (similar)      │  │ [Reply] [Note] [Close]   │  │
│  └────────────────────────┘  └──────────────────────────┘  │
│                                                             │
│  QUICK ACTIONS:                                             │
│  [Issue Refund] [Extend Trial] [Escalate] [Create Bug]     │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```sql
-- Support tickets table
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL UNIQUE,
  
  -- User info
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  org_id TEXT,
  
  -- Ticket content
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'billing', 'account', 'technical', 'feature_request', 
    'bug_report', 'question', 'other'
  )),
  
  -- Status workflow
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',           -- New ticket, awaiting first response
    'pending',        -- Awaiting user reply
    'in_progress',    -- Agent is actively working
    'resolved',       -- Solution provided, awaiting confirmation
    'closed',         -- Ticket completed
    'escalated'       -- Escalated to engineering/management
  )),
  
  -- Priority (auto-calculated or manual)
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'low', 'medium', 'high', 'urgent'
  )),
  
  -- Assignment
  assigned_to TEXT, -- Clerk user ID of agent
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- SLA tracking
  sla_deadline TIMESTAMP WITH TIME ZONE,
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  source TEXT DEFAULT 'web' CHECK (source IN (
    'web', 'email', 'in_app', 'api', 'chat'
  )),
  tags TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Ticket comments/conversation
CREATE TABLE support_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  -- Author info
  author_id TEXT NOT NULL,
  author_email TEXT NOT NULL,
  author_name TEXT,
  is_agent BOOLEAN DEFAULT false,
  is_internal BOOLEAN DEFAULT false, -- Internal notes visible only to agents
  
  -- Content
  content TEXT NOT NULL,
  
  -- Attachments (stored in storage, referenced here)
  attachments JSONB DEFAULT '[]',
  -- [{filename, url, mimeType, size}]
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Edits
  edited_at TIMESTAMP WITH TIME ZONE,
  edited_by TEXT
);

-- Ticket events for audit trail
CREATE TABLE support_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'status_changed', 'assigned', 'comment_added',
    'priority_changed', 'category_changed', 'merged', 'closed'
  )),
  
  old_value TEXT,
  new_value TEXT,
  
  performed_by TEXT NOT NULL,
  performed_by_email TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Canned responses (for agents)
CREATE TABLE support_canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  
  -- Usage tracking
  use_count INTEGER DEFAULT 0,
  
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  is_active BOOLEAN DEFAULT true
);

-- Support team members
CREATE TABLE support_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN (
    'admin', 'agent', 'viewer'
  )),
  
  -- Assignment settings
  max_open_tickets INTEGER DEFAULT 10,
  is_available BOOLEAN DEFAULT true,
  
  -- Skills for auto-routing
  skills TEXT[], -- ['billing', 'technical', 'enterprise']
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_tickets_sla ON support_tickets(sla_deadline) WHERE status IN ('open', 'pending');
CREATE INDEX idx_comments_ticket_id ON support_ticket_comments(ticket_id);
CREATE INDEX idx_events_ticket_id ON support_ticket_events(ticket_id);
```

---

## Key Features

### For Users
1. **Smart Ticket Form**
   - Category selection with quick topics
   - Auto-suggest help articles before submitting
   - Screenshot attachment (drag & drop)
   - Auto-capture browser/OS info for technical issues

2. **Email Notifications**
   - Ticket received confirmation
   - Agent reply notifications
   - Status change updates
   - Satisfaction survey on close

3. **Self-Service Portal**
   - View all their tickets
   - Reply to active tickets
   - Close tickets themselves
   - Reopen closed tickets (within 7 days)

### For Support Team
1. **Smart Routing**
   - Auto-assign based on category
   - Load balancing (round-robin)
   - Skills-based routing
   - Previous agent preference

2. **Context Panel**
   - Full user profile
   - Subscription/plan info
   - Recent activity
   - Past tickets
   - Feature usage

3. **Collaboration Tools**
   - Internal notes
   - @mentions for other agents
   - Ticket merging
   - Linked tickets

4. **Efficiency Features**
   - Canned responses
   - Keyboard shortcuts
   - Bulk actions
   - Macros (multi-step actions)

### For Admins
1. **Analytics Dashboard**
   - Ticket volume trends
   - Response time metrics
   - CSAT scores
   - Agent performance
   - Category breakdown

2. **SLA Management**
   - Configurable SLA rules
   - Breach warnings
   - Escalation workflows

3. **Quality Assurance**
   - Ticket reviews
   - Agent coaching
   - Response templates

---

## API Endpoints

### User Endpoints
```
POST   /api/support/tickets              # Create ticket
GET    /api/support/tickets              # List my tickets
GET    /api/support/tickets/:id          # Get ticket details
POST   /api/support/tickets/:id/comments # Add comment
POST   /api/support/tickets/:id/close    # Close ticket
```

### Agent Endpoints
```
GET    /api/support/queue                # Ticket queue
GET    /api/support/tickets/:id          # Full ticket details
PATCH  /api/support/tickets/:id          # Update ticket (assign, status, priority)
POST   /api/support/tickets/:id/comments # Add comment (public or internal)
GET    /api/support/canned-responses     # List canned responses
POST   /api/support/tickets/:id/merge    # Merge tickets
```

### Admin Endpoints
```
GET    /api/support/analytics            # Dashboard data
GET    /api/support/team                 # Team members
POST   /api/support/team                 # Add team member
GET    /api/support/sla-report           # SLA compliance
```

---

## Implementation Phases

### Phase 1: MVP (Week 1-2)
- Basic ticket submission
- Simple queue for agents
- Email notifications
- Status tracking

### Phase 2: Agent Tools (Week 3-4)
- Assignment system
- Internal notes
- Canned responses
- User context panel

### Phase 3: Intelligence (Week 5-6)
- Auto-routing
- SLA tracking
- Analytics dashboard
- Satisfaction surveys

### Phase 4: Advanced (Week 7-8)
- Ticket merging
- Macros
- Advanced analytics
- Quality assurance tools

---

## Integration Points

1. **Clerk** - User authentication and profiles
2. **Supabase** - Database and real-time updates
3. **Stripe** - Billing context
4. **Postmark/SendGrid** - Email notifications
5. **Slack** - Agent notifications (optional)

---

## Success Metrics

- **User**: Time to submit ticket < 2 minutes
- **Agent**: First response time < 1 hour (business hours)
- **System**: Ticket resolution time < 24 hours
- **Quality**: CSAT score > 4.5/5
