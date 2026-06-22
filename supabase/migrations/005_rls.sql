-- RLS helper functions and policies (organization-level isolation)

-- Resolve Clerk user id from JWT (Supabase Auth or custom Clerk JWT integration)
CREATE OR REPLACE FUNCTION public.current_clerk_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'sub', ''),
    NULLIF(current_setting('request.jwt.claim.sub', true), '')
  );
$$;

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM users u
  WHERE u.clerk_id = public.current_clerk_id()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_org_role(p_organization_id UUID)
RETURNS organization_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.role
  FROM organization_members om
  WHERE om.organization_id = p_organization_id
    AND om.user_id = public.current_app_user_id()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_org_role(p_organization_id) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org_settings(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_org_role(p_organization_id) IN ('owner', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.campaign_org_id(p_campaign_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.organization_id
  FROM campaigns c
  WHERE c.id = p_campaign_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_campaign_member(p_campaign_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_org_member(public.campaign_org_id(p_campaign_id));
$$;

-- Enable RLS on all application tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundraising_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundraising_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- Users: members can read their own row
CREATE POLICY users_select_self ON users
  FOR SELECT
  USING (clerk_id = public.current_clerk_id());

CREATE POLICY users_select_org_peers ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM organization_members om_self
      JOIN organization_members om_peer ON om_peer.organization_id = om_self.organization_id
      WHERE om_self.user_id = public.current_app_user_id()
        AND om_peer.user_id = users.id
    )
  );

-- Organizations
CREATE POLICY organizations_select_member ON organizations
  FOR SELECT
  USING (public.is_org_member(id));

CREATE POLICY organizations_insert_authenticated ON organizations
  FOR INSERT
  WITH CHECK (public.current_clerk_id() IS NOT NULL);

CREATE POLICY organizations_update_admin ON organizations
  FOR UPDATE
  USING (public.can_manage_org_settings(id))
  WITH CHECK (public.can_manage_org_settings(id));

CREATE POLICY organizations_delete_owner ON organizations
  FOR DELETE
  USING (public.user_org_role(id) = 'owner');

-- Organization members
CREATE POLICY organization_members_select_member ON organization_members
  FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY organization_members_insert_admin ON organization_members
  FOR INSERT
  WITH CHECK (public.can_manage_org_settings(organization_id));

CREATE POLICY organization_members_update_admin ON organization_members
  FOR UPDATE
  USING (public.can_manage_org_settings(organization_id))
  WITH CHECK (public.can_manage_org_settings(organization_id));

CREATE POLICY organization_members_delete_admin ON organization_members
  FOR DELETE
  USING (public.can_manage_org_settings(organization_id));

-- Campaigns: org members read/write campaign data
CREATE POLICY campaigns_select_member ON campaigns
  FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY campaigns_insert_member ON campaigns
  FOR INSERT
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY campaigns_update_member ON campaigns
  FOR UPDATE
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY campaigns_delete_admin ON campaigns
  FOR DELETE
  USING (public.can_manage_org_settings(organization_id));

-- Campaign profiles
CREATE POLICY campaign_profiles_select_member ON campaign_profiles
  FOR SELECT
  USING (public.is_campaign_member(campaign_id));

CREATE POLICY campaign_profiles_insert_member ON campaign_profiles
  FOR INSERT
  WITH CHECK (public.is_campaign_member(campaign_id));

CREATE POLICY campaign_profiles_update_member ON campaign_profiles
  FOR UPDATE
  USING (public.is_campaign_member(campaign_id))
  WITH CHECK (public.is_campaign_member(campaign_id));

CREATE POLICY campaign_profiles_delete_admin ON campaign_profiles
  FOR DELETE
  USING (
    public.can_manage_org_settings(public.campaign_org_id(campaign_id))
  );

-- Graph nodes / edges
CREATE POLICY graph_nodes_select_member ON graph_nodes
  FOR SELECT
  USING (public.is_campaign_member(campaign_id));

CREATE POLICY graph_nodes_insert_member ON graph_nodes
  FOR INSERT
  WITH CHECK (public.is_campaign_member(campaign_id));

CREATE POLICY graph_nodes_update_member ON graph_nodes
  FOR UPDATE
  USING (public.is_campaign_member(campaign_id))
  WITH CHECK (public.is_campaign_member(campaign_id));

CREATE POLICY graph_nodes_delete_member ON graph_nodes
  FOR DELETE
  USING (public.is_campaign_member(campaign_id));

CREATE POLICY graph_edges_select_member ON graph_edges
  FOR SELECT
  USING (public.is_campaign_member(campaign_id));

CREATE POLICY graph_edges_insert_member ON graph_edges
  FOR INSERT
  WITH CHECK (public.is_campaign_member(campaign_id));

CREATE POLICY graph_edges_update_member ON graph_edges
  FOR UPDATE
  USING (public.is_campaign_member(campaign_id))
  WITH CHECK (public.is_campaign_member(campaign_id));

CREATE POLICY graph_edges_delete_member ON graph_edges
  FOR DELETE
  USING (public.is_campaign_member(campaign_id));

-- Future-phase tables: org members can read; writes deferred to Phase 2+
CREATE POLICY assets_select_member ON assets
  FOR SELECT
  USING (public.is_campaign_member(campaign_id));

CREATE POLICY calendar_events_select_member ON calendar_events
  FOR SELECT
  USING (public.is_campaign_member(campaign_id));

CREATE POLICY tasks_select_member ON tasks
  FOR SELECT
  USING (public.is_campaign_member(campaign_id));

CREATE POLICY research_briefs_select_member ON research_briefs
  FOR SELECT
  USING (public.is_campaign_member(campaign_id));

CREATE POLICY fundraising_prospects_select_member ON fundraising_prospects
  FOR SELECT
  USING (public.is_campaign_member(campaign_id));

CREATE POLICY fundraising_plans_select_member ON fundraising_plans
  FOR SELECT
  USING (public.is_campaign_member(campaign_id));

CREATE POLICY compliance_records_select_member ON compliance_records
  FOR SELECT
  USING (public.is_campaign_member(campaign_id));

CREATE POLICY ai_generation_logs_select_member ON ai_generation_logs
  FOR SELECT
  USING (public.is_campaign_member(campaign_id));

-- Service role bypasses RLS; these policies protect anon/authenticated clients.
