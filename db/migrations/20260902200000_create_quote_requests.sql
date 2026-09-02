-- migrate:up

-- A Quote Request is a person's immutable, idempotently submitted request for
-- commercial review of one Configuration Revision (CONTEXT.md, ADR 0003, ADR
-- 0006). It pins the revision, the contact, the consent, and the nonbinding
-- price context exactly as they were at submission. It is neither an
-- Authoritative Quote nor an Order.
CREATE TABLE app.quote_request (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  configuration_revision_id uuid NOT NULL,
  -- Customer-facing identifier, safe to read aloud: no 0/O or 1/I.
  reference text NOT NULL UNIQUE
    CHECK (reference ~ '^A-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$'),
  state text NOT NULL DEFAULT 'submitted'
    CHECK (state IN ('submitted', 'in-review', 'answered', 'withdrawn')),
  creation_idempotency_key text NOT NULL,
  request_hash char(64) NOT NULL,
  contact_name text NOT NULL CHECK (char_length(contact_name) BETWEEN 1 AND 120),
  contact_email text NOT NULL CHECK (char_length(contact_email) BETWEEN 3 AND 254),
  contact_phone text CHECK (contact_phone IS NULL OR char_length(contact_phone) BETWEEN 3 AND 40),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 2000),
  consent_version text NOT NULL CHECK (char_length(consent_version) BETWEEN 1 AND 64),
  consent_accepted_at timestamptz NOT NULL,
  -- The Price Indication as computed server-side at submission; never the client's number.
  price_indication jsonb NOT NULL CHECK (jsonb_typeof(price_indication) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, creation_idempotency_key),
  FOREIGN KEY (project_id, configuration_revision_id)
    REFERENCES app.configuration_revision(project_id, id)
    ON DELETE CASCADE
);

CREATE INDEX quote_request_project_created_idx
  ON app.quote_request (project_id, created_at DESC);

CREATE INDEX quote_request_revision_idx
  ON app.quote_request (configuration_revision_id);

-- migrate:down

DROP TABLE IF EXISTS app.quote_request;
