-- migrate:up

-- A Source Capture is an input, not a customer artifact: it goes once its
-- Photo Job has finished and a grace window has passed (ADR 0011,
-- lib/server/photo-jobs/source-capture-retention.ts). A succeeded job keeps
-- its record without it; a job still working on its capture cannot lose it,
-- and the foreign key still refuses to delete a capture any job points at.
ALTER TABLE app.photo_job
  DROP CONSTRAINT photo_job_check1,
  ADD CONSTRAINT photo_job_check1 CHECK (
    state IN ('requested', 'canceled', 'failed', 'succeeded')
    OR source_capture_id IS NOT NULL
  );

-- The retention sweep looks up a capture's jobs, and so does every capture
-- deletion through the foreign key.
CREATE INDEX photo_job_source_capture_idx ON app.photo_job (source_capture_id);

-- migrate:down

DROP INDEX IF EXISTS app.photo_job_source_capture_idx;

-- Fails once a succeeded job has lost its capture: that capture is gone.
ALTER TABLE app.photo_job
  DROP CONSTRAINT photo_job_check1,
  ADD CONSTRAINT photo_job_check1 CHECK (
    state IN ('requested', 'canceled', 'failed')
    OR source_capture_id IS NOT NULL
  );
