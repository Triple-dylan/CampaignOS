-- M8: Planner + Tasks enhancements

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS calendar_events_start_time_idx
  ON calendar_events (campaign_id, start_time);

CREATE INDEX IF NOT EXISTS tasks_status_idx
  ON tasks (campaign_id, status);

CREATE INDEX IF NOT EXISTS tasks_due_date_idx
  ON tasks (campaign_id, due_date);
