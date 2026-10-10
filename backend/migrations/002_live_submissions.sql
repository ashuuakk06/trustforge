ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS problem_statement TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS solution TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS supporting_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'READY';

CREATE INDEX IF NOT EXISTS projects_owner_idx ON projects(owner_id);

CREATE TABLE IF NOT EXISTS submission_processing_events (
  sequence BIGSERIAL PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  progress INTEGER NOT NULL CHECK (progress BETWEEN 0 AND 100),
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS submission_processing_events_project_idx ON submission_processing_events(project_id, sequence);
