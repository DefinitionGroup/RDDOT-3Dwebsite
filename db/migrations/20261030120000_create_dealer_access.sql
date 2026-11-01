-- migrate:up

-- Dealers and the people who work for them (ADR 0014). rotpunkt provisions
-- both; a Dealer User is an identity of its own, never a Customer Account, and
-- is disabled rather than deleted because the share links and Quote Requests
-- it made point at it.
CREATE TABLE app.dealer (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  street text NOT NULL CHECK (char_length(street) BETWEEN 1 AND 160),
  postal_code text NOT NULL
    CHECK (postal_code ~ '^[A-Z0-9][A-Z0-9 -]{1,8}[A-Z0-9]$'),
  city text NOT NULL CHECK (char_length(city) BETWEEN 1 AND 120),
  country char(2) NOT NULL DEFAULT 'DE' CHECK (country ~ '^[A-Z]{2}$'),
  phone text NOT NULL DEFAULT ''
    CHECK (phone = '' OR char_length(phone) BETWEEN 3 AND 40),
  email text NOT NULL DEFAULT '' CHECK (char_length(email) <= 254),
  website text NOT NULL DEFAULT '' CHECK (char_length(website) <= 300),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.dealer_user (
  id uuid PRIMARY KEY,
  dealer_id uuid NOT NULL REFERENCES app.dealer(id) ON DELETE RESTRICT,
  -- The address rotpunkt provisioned; the first email-code sign-in with it
  -- links the authentication identity below.
  email text NOT NULL UNIQUE
    CHECK (email = lower(btrim(email)) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
      AND char_length(email) <= 254),
  name text NOT NULL DEFAULT '' CHECK (char_length(name) <= 120),
  phone text NOT NULL DEFAULT ''
    CHECK (phone = '' OR char_length(phone) BETWEEN 3 AND 40),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX dealer_user_dealer_idx ON app.dealer_user (dealer_id);

-- An authentication identity belongs to a Customer Account or to a Dealer
-- User, never both; the Identity Adapter looks here first.
CREATE TABLE app.dealer_user_identity (
  id uuid PRIMARY KEY,
  dealer_user_id uuid NOT NULL REFERENCES app.dealer_user(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject)
);

CREATE INDEX dealer_user_identity_user_idx
  ON app.dealer_user_identity (dealer_user_id);

-- The owner's permission for one Dealer's users to view and edit one Project.
-- It carries a copy of the contact the owner agreed to show the dealer, taken
-- on the server at granting. Revoked rows stay as the record of what was
-- shared and when; at most one grant per Project is open.
CREATE TABLE app.project_dealer_grant (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES app.project(id) ON DELETE CASCADE,
  dealer_id uuid NOT NULL REFERENCES app.dealer(id) ON DELETE RESTRICT,
  customer_name text NOT NULL DEFAULT '' CHECK (char_length(customer_name) <= 120),
  customer_email text NOT NULL CHECK (char_length(customer_email) BETWEEN 3 AND 254),
  customer_phone text NOT NULL DEFAULT ''
    CHECK (customer_phone = '' OR char_length(customer_phone) BETWEEN 3 AND 40),
  creation_idempotency_key text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (project_id, creation_idempotency_key),
  CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

CREATE UNIQUE INDEX project_dealer_grant_open_project_idx
  ON app.project_dealer_grant (project_id)
  WHERE revoked_at IS NULL;

CREATE INDEX project_dealer_grant_open_dealer_idx
  ON app.project_dealer_grant (dealer_id, granted_at DESC)
  WHERE revoked_at IS NULL;

-- What a dealer makes that leaves the Project records who made it: a dealer
-- sees and revokes only its own links and requests, and its requests count
-- against its own daily limit. Autosaves and versions record nobody
-- (Martin, 2026-10-30).
ALTER TABLE app.shared_revision_link
  ADD COLUMN created_by_dealer_user_id uuid
    REFERENCES app.dealer_user(id) ON DELETE RESTRICT;

ALTER TABLE app.quote_request
  ADD COLUMN submitted_by_dealer_user_id uuid
    REFERENCES app.dealer_user(id) ON DELETE RESTRICT;

CREATE INDEX quote_request_dealer_user_created_idx
  ON app.quote_request (submitted_by_dealer_user_id, created_at DESC)
  WHERE submitted_by_dealer_user_id IS NOT NULL;

-- migrate:down

DROP INDEX IF EXISTS app.quote_request_dealer_user_created_idx;
ALTER TABLE app.quote_request DROP COLUMN IF EXISTS submitted_by_dealer_user_id;
ALTER TABLE app.shared_revision_link DROP COLUMN IF EXISTS created_by_dealer_user_id;
DROP TABLE IF EXISTS app.project_dealer_grant;
DROP TABLE IF EXISTS app.dealer_user_identity;
DROP TABLE IF EXISTS app.dealer_user;
DROP TABLE IF EXISTS app.dealer;
