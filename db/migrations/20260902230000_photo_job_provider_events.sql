-- migrate:up

-- PLAN.md Phase 3: the provider call becomes a submission whose completion
-- arrives by webhook or is reconciled by polling, so a Photo Job survives the
-- browser that requested it (ADR 0008, gap G2). Evidence and timing columns on
-- the job; an idempotent inbox for provider deliveries.
ALTER TABLE app.photo_job
  ADD COLUMN model_identifier text,
  ADD COLUMN submitted_at timestamptz,
  ADD COLUMN completed_at timestamptz,
  ADD COLUMN provider_checked_at timestamptz;

CREATE TABLE app.photo_job_provider_event (
  id uuid PRIMARY KEY,
  -- The provider's delivery id. Redeliveries carry the same id and are ignored.
  event_id text NOT NULL UNIQUE,
  photo_job_id uuid REFERENCES app.photo_job(id) ON DELETE CASCADE,
  -- Kept for audit even when no job matches; provider-shaped, never exposed.
  provider_reference text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('starting', 'processing', 'succeeded', 'failed', 'canceled')),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX photo_job_provider_event_job_idx
  ON app.photo_job_provider_event (photo_job_id, received_at DESC);

CREATE INDEX photo_job_provider_reference_idx
  ON app.photo_job (provider_reference)
  WHERE provider_reference IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS app.photo_job_provider_reference_idx;
DROP TABLE IF EXISTS app.photo_job_provider_event;
ALTER TABLE app.photo_job
  DROP COLUMN IF EXISTS model_identifier,
  DROP COLUMN IF EXISTS submitted_at,
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS provider_checked_at;
