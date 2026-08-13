-- migrate:up

CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE app.customer_account (
  id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending-deletion')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.auth_identity (
  id uuid PRIMARY KEY,
  customer_account_id uuid NOT NULL
    REFERENCES app.customer_account(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject)
);

CREATE INDEX auth_identity_customer_account_idx
  ON app.auth_identity (customer_account_id);

CREATE TABLE app.project (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL
    REFERENCES app.customer_account(id) ON DELETE CASCADE,
  creation_idempotency_key text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  private_notes text NOT NULL DEFAULT '',
  lifecycle text NOT NULL DEFAULT 'active'
    CHECK (lifecycle IN ('active', 'archived', 'trashed')),
  trashed_at timestamptz,
  deletion_due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, creation_idempotency_key),
  CHECK (
    (lifecycle = 'trashed' AND trashed_at IS NOT NULL AND deletion_due_at IS NOT NULL)
    OR
    (lifecycle <> 'trashed' AND trashed_at IS NULL AND deletion_due_at IS NULL)
  )
);

CREATE INDEX project_owner_lifecycle_idx
  ON app.project (owner_id, lifecycle, updated_at DESC);

CREATE TABLE app.working_configuration (
  project_id uuid PRIMARY KEY
    REFERENCES app.project(id) ON DELETE CASCADE,
  normalized_configuration jsonb NOT NULL,
  configuration_hash char(64) NOT NULL,
  schema_version integer NOT NULL CHECK (schema_version > 0),
  product_definition_version text NOT NULL,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(normalized_configuration) = 'object')
);

CREATE TABLE app.configuration_revision (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL
    REFERENCES app.project(id) ON DELETE CASCADE,
  normalized_configuration jsonb NOT NULL,
  configuration_hash char(64) NOT NULL,
  schema_version integer NOT NULL CHECK (schema_version > 0),
  product_definition_version text NOT NULL,
  display_snapshot jsonb NOT NULL,
  trigger text NOT NULL
    CHECK (trigger IN ('version-save', 'share', 'photo', 'quote')),
  label text CHECK (label IS NULL OR char_length(label) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (
    project_id,
    schema_version,
    product_definition_version,
    configuration_hash
  ),
  CHECK (jsonb_typeof(normalized_configuration) = 'object')
);

CREATE INDEX configuration_revision_project_created_idx
  ON app.configuration_revision (project_id, created_at DESC);

CREATE TABLE app.outbox_message (
  id uuid PRIMARY KEY,
  topic text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  request_hash char(64) NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  processed_at timestamptz,
  UNIQUE (topic, idempotency_key),
  CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX outbox_message_delivery_idx
  ON app.outbox_message (available_at, occurred_at)
  WHERE processed_at IS NULL;

-- migrate:down

DROP SCHEMA IF EXISTS app CASCADE;
DROP SCHEMA IF EXISTS auth CASCADE;
