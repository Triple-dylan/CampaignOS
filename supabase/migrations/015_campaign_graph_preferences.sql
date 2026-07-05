-- Graph customization preferences (Obsidian gear-panel parity)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS graph_preferences JSONB DEFAULT NULL;

COMMENT ON COLUMN campaigns.graph_preferences IS
  'Per-campaign graph view preferences: forces, display, filters (see docs/design/graph-customization.md)';
