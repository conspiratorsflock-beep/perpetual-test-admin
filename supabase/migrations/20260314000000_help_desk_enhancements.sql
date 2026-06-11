-- Migration: 20260312_help_desk_enhancements.sql
-- Ticket assignment, seeding, and agent scheduling

-- Add assignment tracking to support_tickets
ALTER TABLE support_tickets 
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES support_team_members(id),
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_assigned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS seeded_at TIMESTAMPTZ;

-- Agent schedules
CREATE TABLE IF NOT EXISTS support_agent_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES support_team_members(id) NOT NULL UNIQUE,
  timezone TEXT DEFAULT 'America/New_York',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Schedule shifts (weekly recurring)
CREATE TABLE IF NOT EXISTS support_schedule_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES support_agent_schedules(id) ON DELETE CASCADE,
  day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Schedule exceptions (PTO, holidays)
CREATE TABLE IF NOT EXISTS support_schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES support_agent_schedules(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  type TEXT CHECK (type IN ('pto', 'holiday', 'custom')),
  note TEXT,
  is_full_day BOOLEAN DEFAULT true,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket seeding log
CREATE TABLE IF NOT EXISTS support_ticket_seeding_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seeded_by UUID REFERENCES auth.users(id),
  tickets_seeded INTEGER NOT NULL,
  strategy TEXT NOT NULL,
  respect_schedule BOOLEAN DEFAULT false,
  max_per_agent INTEGER,
  categories TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to 
  ON support_tickets(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_unassigned 
  ON support_tickets(status, priority) WHERE assigned_to IS NULL AND status IN ('open', 'pending');
CREATE INDEX IF NOT EXISTS idx_schedule_shifts_schedule 
  ON support_schedule_shifts(schedule_id, day_of_week) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_date 
  ON support_schedule_exceptions(schedule_id, exception_date);

-- Function to check if agent is on duty
CREATE OR REPLACE FUNCTION is_agent_on_duty(agent_id UUID, check_time TIMESTAMPTZ DEFAULT now())
RETURNS BOOLEAN AS $$
DECLARE
  agent_timezone TEXT;
  local_time TIMESTAMPTZ;
  local_date DATE;
  local_time_only TIME;
  day_num SMALLINT;
  has_shift BOOLEAN;
  has_exception BOOLEAN;
BEGIN
  -- Get agent's timezone
  SELECT timezone INTO agent_timezone
  FROM support_agent_schedules
  WHERE support_agent_schedules.agent_id = is_agent_on_duty.agent_id
    AND is_active = true;
  
  -- If no schedule, assume always available
  IF agent_timezone IS NULL THEN
    RETURN true;
  END IF;
  
  -- Convert to agent's local time
  local_time := check_time AT TIME ZONE agent_timezone;
  local_date := local_time::DATE;
  local_time_only := local_time::TIME;
  day_num := EXTRACT(DOW FROM local_time)::SMALLINT;
  
  -- Check for exception (PTO/holiday)
  SELECT EXISTS(
    SELECT 1 FROM support_schedule_exceptions
    WHERE schedule_id = (
      SELECT id FROM support_agent_schedules 
      WHERE support_agent_schedules.agent_id = is_agent_on_duty.agent_id
    )
    AND exception_date = local_date
    AND (
      is_full_day = true 
      OR (local_time_only BETWEEN start_time AND end_time)
    )
  ) INTO has_exception;
  
  IF has_exception THEN
    RETURN false;
  END IF;
  
  -- Check for active shift
  SELECT EXISTS(
    SELECT 1 FROM support_schedule_shifts ss
    JOIN support_agent_schedules sas ON ss.schedule_id = sas.id
    WHERE sas.agent_id = is_agent_on_duty.agent_id
    AND ss.day_of_week = day_num
    AND ss.is_active = true
    AND local_time_only BETWEEN ss.start_time AND ss.end_time
  ) INTO has_shift;
  
  RETURN has_shift;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update assigned_at
CREATE OR REPLACE FUNCTION set_assigned_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND OLD.assigned_to IS NULL THEN
    NEW.assigned_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_assigned_at ON support_tickets;
CREATE TRIGGER trigger_set_assigned_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_assigned_at();
