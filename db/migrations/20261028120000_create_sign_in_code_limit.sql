-- migrate:up

-- How many sign-in codes an email address was sent in its current ten-minute
-- window. Better Auth limits code requests per client address only, which a
-- showroom or an office behind one address shares; this caps them per
-- recipient instead (features/customer-accounts/sign-in-code-limit.ts). The
-- address is kept only as a SHA-256 of its trimmed, lower-cased form, and a
-- row goes once its window has passed.
CREATE TABLE app.sign_in_code_limit (
  email_key text PRIMARY KEY CHECK (email_key ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz NOT NULL,
  requests integer NOT NULL CHECK (requests >= 1)
);

CREATE INDEX sign_in_code_limit_window_started_idx
  ON app.sign_in_code_limit (window_started_at);

-- migrate:down

DROP TABLE IF EXISTS app.sign_in_code_limit;
