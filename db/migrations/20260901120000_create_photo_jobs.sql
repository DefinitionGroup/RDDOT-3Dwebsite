-- migrate:up

CREATE TABLE app.source_capture (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  configuration_revision_id uuid NOT NULL,
  storage_key text NOT NULL UNIQUE,
  content_type text NOT NULL
    CHECK (content_type IN ('image/jpeg', 'image/png')),
  max_byte_size integer NOT NULL CHECK (max_byte_size > 0),
  byte_size integer CHECK (byte_size > 0),
  width integer CHECK (width > 0),
  height integer CHECK (height > 0),
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'stored', 'rejected')),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  stored_at timestamptz,
  FOREIGN KEY (project_id, configuration_revision_id)
    REFERENCES app.configuration_revision(project_id, id)
    ON DELETE CASCADE,
  -- A stored capture is validated: dimensions and size are known facts, not claims.
  CHECK (
    (status = 'stored'
      AND byte_size IS NOT NULL AND width IS NOT NULL
      AND height IS NOT NULL AND stored_at IS NOT NULL)
    OR
    (status <> 'stored'
      AND byte_size IS NULL AND width IS NULL
      AND height IS NULL AND stored_at IS NULL)
  ),
  CHECK ((status = 'rejected') = (rejection_reason IS NOT NULL))
);

CREATE INDEX source_capture_project_created_idx
  ON app.source_capture (project_id, created_at DESC);

-- Reserved captures that were never uploaded are swept by retention.
CREATE INDEX source_capture_reserved_idx
  ON app.source_capture (created_at)
  WHERE status = 'reserved';

CREATE TABLE app.photo_job (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  configuration_revision_id uuid NOT NULL,
  source_capture_id uuid REFERENCES app.source_capture(id) ON DELETE RESTRICT,
  scene_preset_key text NOT NULL,
  state text NOT NULL DEFAULT 'requested'
    CHECK (state IN (
      'requested', 'capture-ready', 'submitted', 'running', 'validating',
      'uncertain', 'canceling', 'succeeded', 'failed', 'canceled'
    )),
  creation_idempotency_key text NOT NULL,
  request_hash char(64) NOT NULL,
  -- Provider identifiers never leave the adapter; kept internal and nullable.
  provider_reference text,
  failure_reason text,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  terminal_at timestamptz,
  UNIQUE (project_id, creation_idempotency_key),
  FOREIGN KEY (project_id, configuration_revision_id)
    REFERENCES app.configuration_revision(project_id, id)
    ON DELETE CASCADE,
  CHECK (
    (state IN ('succeeded', 'failed', 'canceled')) = (terminal_at IS NOT NULL)
  ),
  -- No provider work may be attributed to a job that has no validated capture.
  CHECK (
    state IN ('requested', 'canceled', 'failed') OR source_capture_id IS NOT NULL
  )
);

CREATE INDEX photo_job_project_created_idx
  ON app.photo_job (project_id, created_at DESC);

CREATE INDEX photo_job_revision_idx
  ON app.photo_job (configuration_revision_id, created_at DESC);

-- Reconciliation sweeps jobs that are in flight but not terminal.
CREATE INDEX photo_job_in_flight_idx
  ON app.photo_job (updated_at)
  WHERE state IN ('submitted', 'running', 'validating', 'uncertain', 'canceling');

CREATE TABLE app.generated_photo (
  id uuid PRIMARY KEY,
  photo_job_id uuid NOT NULL UNIQUE
    REFERENCES app.photo_job(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  configuration_revision_id uuid NOT NULL,
  storage_key text NOT NULL UNIQUE,
  content_type text NOT NULL
    CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size integer NOT NULL CHECK (byte_size > 0),
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (project_id, configuration_revision_id)
    REFERENCES app.configuration_revision(project_id, id)
    ON DELETE CASCADE
);

-- Drives both the per-Project gallery and the account-wide profile gallery.
CREATE INDEX generated_photo_project_created_idx
  ON app.generated_photo (project_id, created_at DESC);

CREATE INDEX generated_photo_revision_idx
  ON app.generated_photo (configuration_revision_id, created_at DESC);

-- Deleting a row that owns a stored object must enqueue that object's deletion.
-- This lives in a trigger rather than in application code because rows are also
-- removed by ON DELETE CASCADE (Project trash, Customer Account deletion), where
-- no application statement observes the individual row. Without it, cascades
-- would silently orphan objects in the bucket. ADR 0011.
CREATE FUNCTION app.enqueue_storage_object_deletion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.storage_key IS NULL THEN
    RETURN OLD;
  END IF;

  INSERT INTO app.outbox_message (
    id, topic, aggregate_type, aggregate_id,
    idempotency_key, request_hash, payload
  )
  VALUES (
    gen_random_uuid(),
    'storage.object.delete',
    TG_ARGV[0],
    OLD.id,
    OLD.storage_key,
    encode(sha256(OLD.storage_key::bytea), 'hex'),
    jsonb_build_object('storageKey', OLD.storage_key)
  )
  ON CONFLICT (topic, idempotency_key) DO NOTHING;

  RETURN OLD;
END;
$$;

CREATE TRIGGER generated_photo_enqueue_deletion
  AFTER DELETE ON app.generated_photo
  FOR EACH ROW
  EXECUTE FUNCTION app.enqueue_storage_object_deletion('generated-photo');

CREATE TRIGGER source_capture_enqueue_deletion
  AFTER DELETE ON app.source_capture
  FOR EACH ROW
  EXECUTE FUNCTION app.enqueue_storage_object_deletion('source-capture');

-- migrate:down

DROP TRIGGER IF EXISTS source_capture_enqueue_deletion ON app.source_capture;
DROP TRIGGER IF EXISTS generated_photo_enqueue_deletion ON app.generated_photo;
DROP FUNCTION IF EXISTS app.enqueue_storage_object_deletion();
DROP TABLE IF EXISTS app.generated_photo;
DROP TABLE IF EXISTS app.photo_job;
DROP TABLE IF EXISTS app.source_capture;
