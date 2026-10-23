ALTER TABLE projects
  ADD COLUMN owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN problem_statement TEXT NOT NULL DEFAULT '',
  ADD COLUMN solution TEXT NOT NULL DEFAULT '',
  ADD COLUMN supporting_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN content_hash TEXT,
  ADD COLUMN submitted_at TIMESTAMPTZ,
  ADD COLUMN processing_status TEXT NOT NULL DEFAULT 'READY';

CREATE INDEX projects_owner_idx ON projects(owner_id);

CREATE TABLE submission_processing_events (
  sequence BIGSERIAL PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  progress INTEGER NOT NULL CHECK (progress BETWEEN 0 AND 100),
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX submission_processing_events_project_idx ON submission_processing_events(project_id, sequence);
