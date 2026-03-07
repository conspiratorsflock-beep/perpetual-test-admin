-- API Calls Tracking Migration
-- Adds table for tracking daily API usage metrics

-- ─────────────────────────────────────────────────────────────────────────────
-- API Usage Tracking
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_calls INTEGER NOT NULL DEFAULT 0,
  unique_users INTEGER NOT NULL DEFAULT 0,
  unique_orgs INTEGER NOT NULL DEFAULT 0,
  endpoint_breakdown JSONB DEFAULT '{}', -- {"/api/tests": 150, "/api/runs": 75}
  status_breakdown JSONB DEFAULT '{}', -- {"200": 200, "404": 10, "500": 2}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage_daily(date DESC);

-- Enable RLS
ALTER TABLE api_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON api_usage_daily
  FOR ALL USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
DROP TRIGGER IF EXISTS update_api_usage_updated_at ON api_usage_daily;
CREATE TRIGGER update_api_usage_updated_at
  BEFORE UPDATE ON api_usage_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper function to increment API calls
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_api_calls(
  p_endpoint TEXT DEFAULT NULL,
  p_status_code INTEGER DEFAULT NULL,
  p_user_id TEXT DEFAULT NULL,
  p_org_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  today DATE := CURRENT_DATE;
  current_record api_usage_daily%ROWTYPE;
BEGIN
  -- Try to get or create today's record
  INSERT INTO api_usage_daily (date, total_calls, unique_users, unique_orgs)
  VALUES (today, 0, 0, 0)
  ON CONFLICT (date) DO NOTHING;
  
  -- Update the record
  UPDATE api_usage_daily
  SET 
    total_calls = total_calls + 1,
    endpoint_breakdown = jsonb_set(
      endpoint_breakdown,
      ARRAY[COALESCE(p_endpoint, 'unknown')],
      COALESCE((endpoint_breakdown->>COALESCE(p_endpoint, 'unknown'))::integer, 0)::text::jsonb + '1'::jsonb,
      true
    ),
    status_breakdown = jsonb_set(
      status_breakdown,
      ARRAY[COALESCE(p_status_code::text, 'unknown')],
      COALESCE((status_breakdown->>COALESCE(p_status_code::text, 'unknown'))::integer, 0)::text::jsonb + '1'::jsonb,
      true
    ),
    updated_at = NOW()
  WHERE date = today;
  
  -- Note: unique_users and unique_orgs would need to be calculated separately
  -- via a scheduled job or materialized view for accuracy
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- Function to get API calls for date range
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_api_calls_for_range(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  date DATE,
  total_calls INTEGER,
  unique_users INTEGER,
  unique_orgs INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aud.date,
    aud.total_calls,
    aud.unique_users,
    aud.unique_orgs
  FROM api_usage_daily aud
  WHERE aud.date BETWEEN start_date AND end_date
  ORDER BY aud.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
