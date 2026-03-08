-- Support Ticket System Migration
-- Created: March 11, 2026

-- ============================================
-- Support Tickets Table
-- ============================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL UNIQUE,
  
  -- User info (from main app)
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  org_id TEXT,
  
  -- Ticket content
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
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
  
  -- System context (captured at creation)
  browser_info TEXT,
  os_info TEXT,
  app_version TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_sla ON support_tickets(sla_deadline) 
  WHERE status IN ('open', 'pending', 'in_progress');

-- ============================================
-- Ticket Comments/Conversation
-- ============================================
CREATE TABLE IF NOT EXISTS support_ticket_comments (
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
  -- Format: [{filename, url, mimeType, size}]
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Edits
  edited_at TIMESTAMP WITH TIME ZONE,
  edited_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_ticket_id ON support_ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_created_at ON support_ticket_comments(created_at);

-- ============================================
-- Ticket Events (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS support_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'status_changed', 'assigned', 'comment_added',
    'priority_changed', 'category_changed', 'merged', 'closed', 'reopened'
  )),
  
  old_value TEXT,
  new_value TEXT,
  
  performed_by TEXT NOT NULL,
  performed_by_email TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_events_ticket_id ON support_ticket_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_events_created_at ON support_ticket_events(created_at);

-- ============================================
-- Canned Responses (for agents)
-- ============================================
CREATE TABLE IF NOT EXISTS support_canned_responses (
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

CREATE INDEX IF NOT EXISTS idx_support_canned_responses_category ON support_canned_responses(category);
CREATE INDEX IF NOT EXISTS idx_support_canned_responses_is_active ON support_canned_responses(is_active);

-- ============================================
-- Support Team Members
-- ============================================
CREATE TABLE IF NOT EXISTS support_team_members (
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
  skills TEXT[], -- e.g., ['billing', 'technical', 'enterprise']
  
  -- Notification preferences
  notify_on_new_ticket BOOLEAN DEFAULT true,
  notify_on_assigned BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_team_members_user_id ON support_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_support_team_members_is_available ON support_team_members(is_available);

-- ============================================
-- SLA Configuration
-- ============================================
CREATE TABLE IF NOT EXISTS support_sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Response times (in minutes)
  first_response_time INTEGER NOT NULL, -- Business hours
  resolution_time INTEGER, -- Optional
  
  -- Business hours (optional, defaults to 24/7 if null)
  business_hours_start TIME,
  business_hours_end TIME,
  business_days INTEGER[], -- [1,2,3,4,5] for Mon-Fri
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default SLA configurations
INSERT INTO support_sla_config (name, priority, first_response_time, resolution_time)
VALUES 
  ('Urgent SLA', 'urgent', 60, 240),      -- 1 hour response, 4 hour resolution
  ('High SLA', 'high', 240, 1440),        -- 4 hour response, 24 hour resolution
  ('Medium SLA', 'medium', 480, 4320),    -- 8 hour response, 3 day resolution
  ('Low SLA', 'low', 1440, 10080)         -- 24 hour response, 1 week resolution
ON CONFLICT DO NOTHING;

-- ============================================
-- Functions
-- ============================================

-- Function to calculate SLA deadline
CREATE OR REPLACE FUNCTION calculate_sla_deadline(
  p_priority TEXT,
  p_created_at TIMESTAMP WITH TIME ZONE
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  v_sla_config RECORD;
  v_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT * INTO v_sla_config 
  FROM support_sla_config 
  WHERE priority = p_priority AND is_active = true
  LIMIT 1;
  
  IF v_sla_config IS NULL THEN
    -- Default to 24 hours if no SLA config
    RETURN p_created_at + INTERVAL '24 hours';
  END IF;
  
  -- Simple calculation (can be enhanced for business hours)
  v_deadline := p_created_at + (v_sla_config.first_response_time || ' minutes')::INTERVAL;
  
  RETURN v_deadline;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-calculate priority based on category and keywords
CREATE OR REPLACE FUNCTION auto_calculate_priority(
  p_category TEXT,
  p_subject TEXT,
  p_description TEXT
) RETURNS TEXT AS $$
DECLARE
  v_combined_text TEXT;
BEGIN
  v_combined_text := LOWER(p_subject || ' ' || p_description);
  
  -- Urgent keywords
  IF v_combined_text ~ '(urgent|critical|down|outage|broken|cannot access|cant access|payment failed|security|breach|hack)'
     OR p_category = 'bug_report' AND v_combined_text ~ '(crash|error|not working|broken)'
  THEN
    RETURN 'urgent';
  END IF;
  
  -- High priority
  IF v_combined_text ~ '(important|asap|soon|help|issue|problem|error|bug)'
     OR p_category IN ('billing', 'technical')
  THEN
    RETURN 'high';
  END IF;
  
  -- Low priority
  IF p_category IN ('feature_request', 'question') 
     AND NOT v_combined_text ~ '(urgent|asap|important|critical)'
  THEN
    RETURN 'low';
  END IF;
  
  -- Default
  RETURN 'medium';
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set priority and SLA on ticket creation
CREATE OR REPLACE FUNCTION support_ticket_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate priority if not set
  IF NEW.priority IS NULL OR NEW.priority = 'medium' THEN
    NEW.priority := auto_calculate_priority(NEW.category, NEW.subject, NEW.description);
  END IF;
  
  -- Calculate SLA deadline
  NEW.sla_deadline := calculate_sla_deadline(NEW.priority, NEW.created_at);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_support_ticket_before_insert ON support_tickets;
CREATE TRIGGER trigger_support_ticket_before_insert
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION support_ticket_before_insert();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER trigger_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_support_team_members_updated_at ON support_team_members;
CREATE TRIGGER trigger_support_team_members_updated_at
  BEFORE UPDATE ON support_team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_support_canned_responses_updated_at ON support_canned_responses;
CREATE TRIGGER trigger_support_canned_responses_updated_at
  BEFORE UPDATE ON support_canned_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_canned_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_team_members ENABLE ROW LEVEL SECURITY;

-- Note: Create specific policies based on your auth setup
-- For now, service role bypasses RLS (for admin console)

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE support_tickets IS 'Main support ticket table for the help desk system';
COMMENT ON TABLE support_ticket_comments IS 'Comments and conversation threads for tickets';
COMMENT ON TABLE support_ticket_events IS 'Audit trail of all ticket events';
COMMENT ON TABLE support_canned_responses IS 'Pre-written responses for agents';
COMMENT ON TABLE support_team_members IS 'Support team configuration and settings';
COMMENT ON TABLE support_sla_config IS 'SLA configuration for different priority levels';
