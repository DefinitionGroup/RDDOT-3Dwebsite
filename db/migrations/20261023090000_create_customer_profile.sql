-- migrate:up

-- What a person keeps about themselves in their Customer Account (ADR 0001:
-- the account, not the authentication provider, owns it). Every field may
-- stay empty; a Quote Request copies its own contact at submission, so later
-- edits here never rewrite a request. Deleted with the account.
CREATE TABLE app.customer_profile (
  customer_account_id uuid PRIMARY KEY
    REFERENCES app.customer_account(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '' CHECK (char_length(name) <= 120),
  phone text NOT NULL DEFAULT ''
    CHECK (phone = '' OR char_length(phone) BETWEEN 3 AND 40),
  postal_code text NOT NULL DEFAULT ''
    CHECK (postal_code = '' OR postal_code ~ '^[A-Z0-9][A-Z0-9 -]{1,8}[A-Z0-9]$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- migrate:down

DROP TABLE IF EXISTS app.customer_profile;
