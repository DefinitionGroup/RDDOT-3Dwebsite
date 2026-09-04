-- migrate:up

-- A Development Email Capture is one authentication mail the development
-- capture adapter kept instead of sending (ADR 0010). It exists so a test
-- deployment can show the one-time code on screen without a mail provider.
-- The table is written only while TRANSACTIONAL_EMAIL_PROVIDER is
-- `development-capture`; a production provider never touches it. Rows are
-- short-lived: the adapter prunes anything older than ten minutes and keeps
-- at most twenty rows per recipient.
CREATE TABLE app.development_email_capture (
  id uuid PRIMARY KEY,
  -- Trimmed and lower-cased at write time so lookups are exact.
  recipient text NOT NULL CHECK (char_length(recipient) BETWEEN 3 AND 254),
  message jsonb NOT NULL CHECK (jsonb_typeof(message) = 'object'),
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX development_email_capture_recipient_captured_idx
  ON app.development_email_capture (recipient, captured_at DESC);

-- migrate:down

DROP TABLE IF EXISTS app.development_email_capture;
