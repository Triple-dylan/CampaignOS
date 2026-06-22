-- M9: Research Hub enhancements

CREATE TYPE research_brief_status AS ENUM ('draft', 'complete');

ALTER TABLE research_briefs
  ADD COLUMN IF NOT EXISTS status research_brief_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS key_findings_json JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS research_briefs_status_idx
  ON research_briefs (campaign_id, status);

CREATE INDEX IF NOT EXISTS research_briefs_research_type_idx
  ON research_briefs (campaign_id, research_type);

CREATE INDEX IF NOT EXISTS research_briefs_created_at_idx
  ON research_briefs (campaign_id, created_at DESC);
