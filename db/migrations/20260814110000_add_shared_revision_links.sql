-- migrate:up

ALTER TABLE app.configuration_revision
  ADD CONSTRAINT configuration_revision_project_id_id_key
  UNIQUE (project_id, id);

CREATE TABLE app.shared_revision_link (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  configuration_revision_id uuid NOT NULL,
  token_hash char(64) NOT NULL UNIQUE,
  creation_idempotency_key text NOT NULL,
  request_hash char(64) NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, creation_idempotency_key),
  FOREIGN KEY (project_id, configuration_revision_id)
    REFERENCES app.configuration_revision(project_id, id)
    ON DELETE CASCADE,
  CHECK (expires_at > created_at),
  CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX shared_revision_link_project_created_idx
  ON app.shared_revision_link (project_id, created_at DESC);

CREATE INDEX shared_revision_link_active_expiry_idx
  ON app.shared_revision_link (expires_at)
  WHERE revoked_at IS NULL;

-- migrate:down

DROP TABLE IF EXISTS app.shared_revision_link;

ALTER TABLE app.configuration_revision
  DROP CONSTRAINT IF EXISTS configuration_revision_project_id_id_key;
