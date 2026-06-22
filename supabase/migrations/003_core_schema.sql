-- Core enums
CREATE TYPE organization_role AS ENUM (
  'owner',
  'admin',
  'manager',
  'member',
  'reviewer',
  'viewer'
);

CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'archived');

CREATE TYPE graph_node_type AS ENUM (
  'candidate',
  'issue',
  'voter_segment',
  'donor',
  'prospect',
  'organization',
  'event',
  'asset',
  'research',
  'task',
  'opponent',
  'compliance'
);

CREATE TYPE graph_relationship_type AS ENUM (
  'supports',
  'references',
  'targets',
  'belongs_to',
  'created_from',
  'requires_review',
  'assigned_to',
  'aligns_with',
  'opposes',
  'connected_to',
  'scheduled_for',
  'derived_from'
);

-- Organizations (Clerk org sync)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  slug TEXT,
  owner_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX organizations_owner_user_id_idx ON organizations (owner_user_id);
CREATE INDEX organizations_clerk_org_id_idx ON organizations (clerk_org_id);

COMMENT ON TABLE organizations IS 'Campaign team workspace synced from Clerk organizations';

-- Organization members (RBAC)
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  clerk_membership_id TEXT UNIQUE,
  role organization_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX organization_members_org_id_idx ON organization_members (organization_id);
CREATE INDEX organization_members_user_id_idx ON organization_members (user_id);

COMMENT ON TABLE organization_members IS 'Organization membership and RBAC roles';

-- Campaigns (one active campaign per organization)
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  candidate_name TEXT,
  office_sought TEXT,
  jurisdiction TEXT,
  state TEXT DEFAULT 'WA',
  district TEXT,
  party TEXT,
  election_date DATE,
  campaign_website TEXT,
  campaign_status campaign_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX campaigns_organization_id_idx ON campaigns (organization_id);
CREATE INDEX campaigns_status_idx ON campaigns (campaign_status);

-- Enforce one active campaign per organization
CREATE UNIQUE INDEX campaigns_one_active_per_org_idx
  ON campaigns (organization_id)
  WHERE campaign_status = 'active';

COMMENT ON TABLE campaigns IS 'Campaign workspace; at most one active campaign per organization';

-- Campaign profile (onboarding synthesis data)
CREATE TABLE campaign_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL UNIQUE REFERENCES campaigns (id) ON DELETE CASCADE,
  candidate_bio TEXT,
  campaign_themes TEXT[] DEFAULT '{}',
  top_issues TEXT[] DEFAULT '{}',
  voter_segments JSONB DEFAULT '[]'::jsonb,
  tone_preferences JSONB DEFAULT '{}'::jsonb,
  opponent_names TEXT[] DEFAULT '{}',
  fundraising_goal NUMERIC(12, 2),
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX campaign_profiles_campaign_id_idx ON campaign_profiles (campaign_id);

COMMENT ON TABLE campaign_profiles IS 'Onboarding and AI-synthesized campaign profile data';

-- Knowledge graph (minimal use until Phase 2)
CREATE TABLE graph_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  node_type graph_node_type NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  source_object_type TEXT,
  source_object_id UUID,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  embedding extensions.vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX graph_nodes_campaign_id_idx ON graph_nodes (campaign_id);
CREATE INDEX graph_nodes_node_type_idx ON graph_nodes (node_type);
CREATE INDEX graph_nodes_source_idx ON graph_nodes (source_object_type, source_object_id);

CREATE TABLE graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES graph_nodes (id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES graph_nodes (id) ON DELETE CASCADE,
  relationship_type graph_relationship_type NOT NULL,
  confidence NUMERIC(4, 3),
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_node_id <> target_node_id)
);

CREATE INDEX graph_edges_campaign_id_idx ON graph_edges (campaign_id);
CREATE INDEX graph_edges_source_idx ON graph_edges (source_node_id);
CREATE INDEX graph_edges_target_idx ON graph_edges (target_node_id);

COMMENT ON TABLE graph_nodes IS 'Campaign Brain knowledge graph nodes';
COMMENT ON TABLE graph_edges IS 'Campaign Brain knowledge graph edges';

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER organization_members_set_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER campaigns_set_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER campaign_profiles_set_updated_at
  BEFORE UPDATE ON campaign_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER graph_nodes_set_updated_at
  BEFORE UPDATE ON graph_nodes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
