-- M12: Scheduled runs / workflow automations (scaffold)

CREATE TYPE workflow_schedule_type AS ENUM ('daily', 'weekly', 'custom_cron');

CREATE TYPE workflow_schedule_status AS ENUM (
  'pending_implementation',
  'active',
  'paused',
  'error'
);

CREATE TYPE workflow_run_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'skipped',
  'pending_implementation'
);

-- Automation definitions (Cursor Automations analog)
CREATE TABLE workflow_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  agent_mode TEXT NOT NULL DEFAULT 'campaign-manager',
  schedule_type workflow_schedule_type NOT NULL DEFAULT 'weekly',
  cron_expression TEXT,
  schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  status workflow_schedule_status NOT NULL DEFAULT 'pending_implementation',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX workflow_schedules_campaign_id_idx
  ON workflow_schedules (campaign_id);

CREATE INDEX workflow_schedules_enabled_idx
  ON workflow_schedules (campaign_id, enabled)
  WHERE enabled = TRUE;

CREATE INDEX workflow_schedules_next_run_idx
  ON workflow_schedules (next_run_at)
  WHERE enabled = TRUE AND status = 'active';

COMMENT ON TABLE workflow_schedules IS
  'Scheduled AI workflow definitions per campaign (name, schedule, agent prompt).';

-- Execution history per schedule tick
CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES workflow_schedules (id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  status workflow_run_status NOT NULL DEFAULT 'pending_implementation',
  prompt_snapshot TEXT,
  agent_mode TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  output_text TEXT,
  output_json JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  ai_generation_log_id UUID REFERENCES ai_generation_logs (id) ON DELETE SET NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX workflow_runs_schedule_id_idx
  ON workflow_runs (schedule_id, created_at DESC);

CREATE INDEX workflow_runs_campaign_id_idx
  ON workflow_runs (campaign_id, created_at DESC);

COMMENT ON TABLE workflow_runs IS
  'Individual executions of a workflow schedule; linked to ai_generation_logs when run.';

CREATE TRIGGER workflow_schedules_set_updated_at
  BEFORE UPDATE ON workflow_schedules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS (reads via client; writes via service role — matches other campaign tables)
ALTER TABLE workflow_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY workflow_schedules_select_member ON workflow_schedules
  FOR SELECT
  USING (public.is_campaign_member(campaign_id));

CREATE POLICY workflow_runs_select_member ON workflow_runs
  FOR SELECT
  USING (public.is_campaign_member(campaign_id));
