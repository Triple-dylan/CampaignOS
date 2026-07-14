-- Multiplayer / team workspace foundations
-- activity feed, private chat, comment threads, presence, content versions

CREATE TYPE comment_author_kind AS ENUM ('user', 'agent');

CREATE TYPE presence_action AS ENUM (
  'viewing',
  'editing',
  'commenting',
  'reviewing',
  'agent_running'
);

CREATE TYPE activity_actor_kind AS ENUM ('user', 'agent', 'system');

-- ---------------------------------------------------------------------------
-- Activity events (shared campaign audit / digest substrate)
-- ---------------------------------------------------------------------------
CREATE TABLE activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  actor_kind activity_actor_kind NOT NULL DEFAULT 'user',
  actor_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  agent_id TEXT,
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT,
  summary TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX activity_events_campaign_created_idx
  ON activity_events (campaign_id, created_at DESC);
CREATE INDEX activity_events_object_idx
  ON activity_events (campaign_id, object_type, object_id);

COMMENT ON TABLE activity_events IS 'Shared campaign activity feed for team awareness';

-- ---------------------------------------------------------------------------
-- Private AI chat (per user + campaign)
-- ---------------------------------------------------------------------------
CREATE TABLE private_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX private_chat_threads_user_campaign_idx
  ON private_chat_threads (user_id, campaign_id, updated_at DESC);

CREATE TABLE private_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES private_chat_threads (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  agent_id TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX private_chat_messages_thread_idx
  ON private_chat_messages (thread_id, created_at ASC);

COMMENT ON TABLE private_chat_threads IS 'Per-user private AI chat threads scoped to a campaign';

-- ---------------------------------------------------------------------------
-- Object-scoped comment threads (+ @AI)
-- ---------------------------------------------------------------------------
CREATE TABLE comment_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, object_type, object_id)
);

CREATE INDEX comment_threads_campaign_idx
  ON comment_threads (campaign_id, updated_at DESC);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES comment_threads (id) ON DELETE CASCADE,
  author_kind comment_author_kind NOT NULL DEFAULT 'user',
  author_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  agent_id TEXT,
  body TEXT NOT NULL,
  parent_id UUID REFERENCES comments (id) ON DELETE SET NULL,
  mention_user_ids UUID[] NOT NULL DEFAULT '{}',
  mention_agent_ids TEXT[] NOT NULL DEFAULT '{}',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX comments_thread_idx ON comments (thread_id, created_at ASC);

COMMENT ON TABLE comment_threads IS 'Shared discussion threads anchored to campaign objects';

-- ---------------------------------------------------------------------------
-- Semantic presence (who is attending which Focus room)
-- ---------------------------------------------------------------------------
CREATE TABLE presence_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  module TEXT,
  object_type TEXT,
  object_id TEXT,
  action presence_action NOT NULL DEFAULT 'viewing',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, user_id)
);

CREATE INDEX presence_sessions_campaign_seen_idx
  ON presence_sessions (campaign_id, last_seen_at DESC);
CREATE INDEX presence_sessions_object_idx
  ON presence_sessions (campaign_id, object_type, object_id)
  WHERE object_id IS NOT NULL;

COMMENT ON TABLE presence_sessions IS 'Ephemeral semantic presence; one row per user per campaign';

-- ---------------------------------------------------------------------------
-- Content versions (soft conflict / Phase C foundation — not full CRDT)
-- ---------------------------------------------------------------------------
CREATE TABLE content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  content TEXT,
  content_json JSONB,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  agent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, object_type, object_id, version)
);

CREATE INDEX content_versions_object_idx
  ON content_versions (campaign_id, object_type, object_id, version DESC);

COMMENT ON TABLE content_versions IS 'Append-only snapshots for optimistic concurrency and history';

-- Optional version counters on mutable shared objects
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS content_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE research_briefs
  ADD COLUMN IF NOT EXISTS content_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS content_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_events_select ON activity_events
  FOR SELECT USING (public.is_campaign_member(campaign_id));

CREATE POLICY activity_events_insert ON activity_events
  FOR INSERT WITH CHECK (public.is_campaign_member(campaign_id));

CREATE POLICY private_chat_threads_select ON private_chat_threads
  FOR SELECT USING (
    user_id = public.current_app_user_id()
    AND public.is_campaign_member(campaign_id)
  );

CREATE POLICY private_chat_threads_mutate ON private_chat_threads
  FOR ALL USING (
    user_id = public.current_app_user_id()
    AND public.is_campaign_member(campaign_id)
  )
  WITH CHECK (
    user_id = public.current_app_user_id()
    AND public.is_campaign_member(campaign_id)
  );

CREATE POLICY private_chat_messages_select ON private_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM private_chat_threads t
      WHERE t.id = thread_id
        AND t.user_id = public.current_app_user_id()
    )
  );

CREATE POLICY private_chat_messages_mutate ON private_chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM private_chat_threads t
      WHERE t.id = thread_id
        AND t.user_id = public.current_app_user_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM private_chat_threads t
      WHERE t.id = thread_id
        AND t.user_id = public.current_app_user_id()
    )
  );

CREATE POLICY comment_threads_select ON comment_threads
  FOR SELECT USING (public.is_campaign_member(campaign_id));

CREATE POLICY comment_threads_mutate ON comment_threads
  FOR ALL USING (public.is_campaign_member(campaign_id))
  WITH CHECK (public.is_campaign_member(campaign_id));

CREATE POLICY comments_select ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM comment_threads t
      WHERE t.id = thread_id
        AND public.is_campaign_member(t.campaign_id)
    )
  );

CREATE POLICY comments_mutate ON comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM comment_threads t
      WHERE t.id = thread_id
        AND public.is_campaign_member(t.campaign_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM comment_threads t
      WHERE t.id = thread_id
        AND public.is_campaign_member(t.campaign_id)
    )
  );

CREATE POLICY presence_sessions_select ON presence_sessions
  FOR SELECT USING (public.is_campaign_member(campaign_id));

CREATE POLICY presence_sessions_mutate ON presence_sessions
  FOR ALL USING (
    user_id = public.current_app_user_id()
    AND public.is_campaign_member(campaign_id)
  )
  WITH CHECK (
    user_id = public.current_app_user_id()
    AND public.is_campaign_member(campaign_id)
  );

CREATE POLICY content_versions_select ON content_versions
  FOR SELECT USING (public.is_campaign_member(campaign_id));

CREATE POLICY content_versions_insert ON content_versions
  FOR INSERT WITH CHECK (public.is_campaign_member(campaign_id));
