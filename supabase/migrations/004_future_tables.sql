-- Schema-only tables (DDL for later phases)

CREATE TYPE asset_type AS ENUM (
  'logo',
  'brand_kit',
  'social_post',
  'flyer',
  'email',
  'speech',
  'press_release',
  'fundraising_email',
  'event_graphic',
  'website_copy'
);

CREATE TYPE asset_status AS ENUM (
  'draft',
  'needs_review',
  'approved',
  'scheduled',
  'published',
  'archived'
);

CREATE TYPE calendar_event_type AS ENUM (
  'content',
  'fundraiser',
  'speech',
  'debate',
  'volunteer',
  'canvassing',
  'compliance',
  'internal',
  'public_event'
);

CREATE TYPE research_type AS ENUM (
  'district',
  'issue',
  'opponent',
  'voter_segment',
  'media',
  'donor',
  'organization',
  'policy'
);

CREATE TYPE prospect_type AS ENUM (
  'individual',
  'business',
  'organization',
  'pac',
  'host',
  'peer_campaign',
  'community_leader'
);

CREATE TYPE prospect_status AS ENUM (
  'research',
  'not_contacted',
  'contacted',
  'follow_up',
  'pledged',
  'donated',
  'declined',
  'archived'
);

CREATE TYPE task_status AS ENUM (
  'todo',
  'in_progress',
  'blocked',
  'needs_review',
  'done',
  'archived'
);

CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE compliance_review_status AS ENUM (
  'not_required',
  'required',
  'pending',
  'approved',
  'rejected'
);

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  asset_type asset_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  content_text TEXT,
  status asset_status NOT NULL DEFAULT 'draft',
  channel TEXT,
  theme TEXT,
  issue TEXT,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  prompt_used TEXT,
  model_used TEXT,
  template_used TEXT,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users (id) ON DELETE SET NULL,
  compliance_status compliance_review_status NOT NULL DEFAULT 'not_required',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type calendar_event_type NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  related_asset_id UUID REFERENCES assets (id) ON DELETE SET NULL,
  related_task_id UUID,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE research_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  research_type research_type NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  sources_json JSONB DEFAULT '[]'::jsonb,
  confidence_level NUMERIC(4, 3),
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  prompt_used TEXT,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fundraising_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prospect_type prospect_type NOT NULL,
  organization_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  location TEXT,
  alignment_reason TEXT,
  related_issue TEXT,
  estimated_capacity NUMERIC(12, 2),
  status prospect_status NOT NULL DEFAULT 'research',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fundraising_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal_amount NUMERIC(12, 2),
  plan_body TEXT,
  timeline_json JSONB DEFAULT '[]'::jsonb,
  outreach_strategy TEXT,
  event_strategy TEXT,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  owner_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  related_asset_id UUID REFERENCES assets (id) ON DELETE SET NULL,
  related_event_id UUID REFERENCES calendar_events (id) ON DELETE SET NULL,
  related_research_id UUID REFERENCES research_briefs (id) ON DELETE SET NULL,
  related_prospect_id UUID REFERENCES fundraising_prospects (id) ON DELETE SET NULL,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE calendar_events
  ADD CONSTRAINT calendar_events_related_task_id_fkey
  FOREIGN KEY (related_task_id) REFERENCES tasks (id) ON DELETE SET NULL;

CREATE TABLE compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  related_asset_id UUID REFERENCES assets (id) ON DELETE SET NULL,
  content_type TEXT,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  synthetic_media BOOLEAN NOT NULL DEFAULT FALSE,
  sponsor_name TEXT,
  sponsor_address TEXT,
  vendor_name TEXT,
  amount_paid NUMERIC(12, 2),
  distribution_channel TEXT,
  intended_audience TEXT,
  required_disclosure BOOLEAN NOT NULL DEFAULT FALSE,
  disclosure_text TEXT,
  review_status compliance_review_status NOT NULL DEFAULT 'not_required',
  reviewed_by UUID REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  archive_until DATE,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  module TEXT NOT NULL,
  prompt TEXT,
  system_prompt TEXT,
  model TEXT,
  input_json JSONB DEFAULT '{}'::jsonb,
  output_json JSONB DEFAULT '{}'::jsonb,
  output_text TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  created_object_type TEXT,
  created_object_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX assets_campaign_id_idx ON assets (campaign_id);
CREATE INDEX calendar_events_campaign_id_idx ON calendar_events (campaign_id);
CREATE INDEX research_briefs_campaign_id_idx ON research_briefs (campaign_id);
CREATE INDEX fundraising_prospects_campaign_id_idx ON fundraising_prospects (campaign_id);
CREATE INDEX fundraising_plans_campaign_id_idx ON fundraising_plans (campaign_id);
CREATE INDEX tasks_campaign_id_idx ON tasks (campaign_id);
CREATE INDEX compliance_records_campaign_id_idx ON compliance_records (campaign_id);
CREATE INDEX ai_generation_logs_campaign_id_idx ON ai_generation_logs (campaign_id);

CREATE TRIGGER assets_set_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER calendar_events_set_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER research_briefs_set_updated_at
  BEFORE UPDATE ON research_briefs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER fundraising_prospects_set_updated_at
  BEFORE UPDATE ON fundraising_prospects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER fundraising_plans_set_updated_at
  BEFORE UPDATE ON fundraising_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
