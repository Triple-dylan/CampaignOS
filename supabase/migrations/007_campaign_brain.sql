-- M6: Campaign Brain AI outputs on campaign_profiles + graph node types

ALTER TABLE campaign_profiles
  ADD COLUMN IF NOT EXISTS message_framework JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS issue_map JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS brain_generated_at TIMESTAMPTZ;

COMMENT ON COLUMN campaign_profiles.message_framework IS 'AI-generated value prop, key messages, tone guidance';
COMMENT ON COLUMN campaign_profiles.issue_map IS 'AI-generated strategic issue map with talking points';
COMMENT ON COLUMN campaign_profiles.brain_generated_at IS 'Timestamp of last Campaign Brain generation';

ALTER TYPE graph_node_type ADD VALUE IF NOT EXISTS 'message_theme';
ALTER TYPE graph_node_type ADD VALUE IF NOT EXISTS 'strategic_priority';
