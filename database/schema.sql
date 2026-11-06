CREATE TABLE IF NOT EXISTS demo_workspaces (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  data jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS demo_workspaces_updated_at ON demo_workspaces(updated_at);
