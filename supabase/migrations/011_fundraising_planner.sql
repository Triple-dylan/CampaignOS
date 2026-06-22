-- M10: Fundraising Planner — raised amount tracking and outreach history

ALTER TABLE fundraising_plans
  ADD COLUMN IF NOT EXISTS raised_amount NUMERIC(12, 2) DEFAULT 0;

ALTER TABLE fundraising_prospects
  ADD COLUMN IF NOT EXISTS outreach_history_json JSONB DEFAULT '[]'::jsonb;
