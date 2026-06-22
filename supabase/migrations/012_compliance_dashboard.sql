-- M11: Compliance dashboard — review notes and auto-check metadata
ALTER TABLE compliance_records
  ADD COLUMN IF NOT EXISTS review_notes TEXT,
  ADD COLUMN IF NOT EXISTS flags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_checks_json JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS compliance_records_review_status_idx
  ON compliance_records (campaign_id, review_status);

CREATE INDEX IF NOT EXISTS compliance_records_created_at_idx
  ON compliance_records (campaign_id, created_at DESC);
