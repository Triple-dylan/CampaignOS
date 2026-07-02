-- Organization integrations (Canva, Higgsfield, Google Calendar, Gmail)
CREATE TYPE integration_provider AS ENUM (
  'canva',
  'higgsfield',
  'google_calendar',
  'gmail'
);

CREATE TYPE integration_status AS ENUM (
  'disconnected',
  'connected',
  'error',
  'expired'
);

CREATE TABLE organization_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  status integration_status NOT NULL DEFAULT 'disconnected',
  scopes TEXT[] DEFAULT '{}',
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  connected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider)
);

CREATE TABLE integration_external_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  local_object_type TEXT NOT NULL,
  local_object_id UUID NOT NULL,
  external_id TEXT NOT NULL,
  external_url TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider, local_object_type, local_object_id)
);

CREATE INDEX idx_integration_mappings_local
  ON integration_external_mappings (organization_id, local_object_type, local_object_id);

-- Resumable chat workflow state (cross-session)
CREATE TYPE workflow_chat_phase AS ENUM (
  'collecting',
  'generating',
  'previewing',
  'saving',
  'complete',
  'error'
);

CREATE TABLE workflow_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  thread_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  phase workflow_chat_phase NOT NULL DEFAULT 'collecting',
  step_index INT NOT NULL DEFAULT 0,
  fields_json JSONB NOT NULL DEFAULT '{}',
  drafts_json JSONB,
  progress_label TEXT,
  error_message TEXT,
  artifact_link TEXT,
  artifact_label TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, thread_id)
);

CREATE INDEX idx_workflow_chat_sessions_campaign
  ON workflow_chat_sessions (campaign_id, updated_at DESC);

ALTER TABLE organization_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_external_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_integrations_select ON organization_integrations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_clerk_id())
    )
  );

CREATE POLICY integration_external_mappings_select ON integration_external_mappings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = current_clerk_id())
    )
  );

CREATE POLICY workflow_chat_sessions_select ON workflow_chat_sessions
  FOR SELECT USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN organization_members om ON om.organization_id = c.organization_id
      WHERE om.user_id = (SELECT id FROM users WHERE clerk_id = current_clerk_id())
    )
  );
