CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'ORGANIZER', 'JUDGE', 'PARTICIPANT')),
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_family_idx ON refresh_tokens(family_id);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  submission_deadline TIMESTAMPTZ NOT NULL,
  judging_deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  track TEXT NOT NULL,
  description TEXT NOT NULL,
  technology TEXT NOT NULL,
  team TEXT NOT NULL,
  repository TEXT NOT NULL,
  demo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS judges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  tendency TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS judge_conflicts (
  judge_id TEXT NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'Declared conflict',
  PRIMARY KEY (judge_id, project_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  judge_id TEXT NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ASSIGNED',
  fairness_score NUMERIC(6, 3) NOT NULL,
  explanation TEXT NOT NULL,
  algorithm_version TEXT NOT NULL,
  seed TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (judge_id, project_id)
);
CREATE INDEX IF NOT EXISTS assignments_project_idx ON assignments(project_id);

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  judge_id TEXT NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  submission_version INTEGER NOT NULL,
  rubric_version TEXT NOT NULL,
  scores JSONB NOT NULL,
  raw_score NUMERIC(8, 3) NOT NULL CHECK (raw_score BETWEEN 0 AND 100),
  weighted_score NUMERIC(8, 3) NOT NULL CHECK (weighted_score BETWEEN 0 AND 100),
  comment TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (judge_id, project_id, submission_version)
);
CREATE INDEX IF NOT EXISTS evaluations_judge_idx ON evaluations(judge_id);

CREATE TABLE IF NOT EXISTS normalization_runs (
  id TEXT PRIMARY KEY,
  method TEXT NOT NULL,
  algorithm_version TEXT NOT NULL,
  actor TEXT NOT NULL,
  judge_stats JSONB NOT NULL,
  scores JSONB NOT NULL,
  input_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anomalies (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES normalization_runs(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  judge_id TEXT NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  observed NUMERIC(8, 3) NOT NULL,
  baseline NUMERIC(8, 3) NOT NULL,
  confidence NUMERIC(5, 3) NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  evidence TEXT NOT NULL,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  voter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'COUNTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (voter_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  sequence BIGSERIAL PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  request_id TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL,
  payload JSONB NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'VERIFIED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events(created_at);

CREATE TABLE IF NOT EXISTS result_snapshots (
  version TEXT PRIMARY KEY,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  methodology TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  entries JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  participant_name TEXT NOT NULL,
  event_name TEXT NOT NULL,
  achievement TEXT NOT NULL,
  issued_date DATE NOT NULL,
  signature TEXT NOT NULL
);

INSERT INTO schema_migrations(version) VALUES ('001_foundation') ON CONFLICT DO NOTHING;
