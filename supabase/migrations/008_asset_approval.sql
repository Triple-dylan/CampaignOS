-- Asset Studio (M7): approval timestamp on assets

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
