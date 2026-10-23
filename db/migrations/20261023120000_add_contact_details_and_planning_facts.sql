-- migrate:up

-- Profile P1: how to address and reach the person, and whether they plan
-- privately or for a client. Every field may stay empty ('' is no answer).
ALTER TABLE app.customer_profile
  ADD COLUMN salutation text NOT NULL DEFAULT ''
    CHECK (salutation IN ('', 'frau', 'herr', 'divers')),
  ADD COLUMN title text NOT NULL DEFAULT ''
    CHECK (char_length(title) <= 40),
  ADD COLUMN contact_channel text NOT NULL DEFAULT ''
    CHECK (contact_channel IN ('', 'phone', 'email', 'either')),
  ADD COLUMN contact_time text NOT NULL DEFAULT ''
    CHECK (contact_time IN ('', 'morning', 'afternoon', 'evening', 'anytime')),
  ADD COLUMN customer_type text NOT NULL DEFAULT ''
    CHECK (customer_type IN ('', 'private', 'professional')),
  ADD COLUMN company text NOT NULL DEFAULT ''
    CHECK (char_length(company) <= 120),
  ADD COLUMN professional_role text NOT NULL DEFAULT ''
    CHECK (professional_role IN ('', 'architecture', 'developer', 'trade', 'other')),
  -- Asking to be called needs a number; a company belongs to professionals.
  ADD CONSTRAINT customer_profile_phone_for_calls
    CHECK (contact_channel <> 'phone' OR phone <> ''),
  ADD CONSTRAINT customer_profile_company_for_professionals
    CHECK (CASE WHEN customer_type = 'professional' THEN company <> ''
                ELSE company = '' AND professional_role = '' END);

-- A Quote Request keeps its own copy of the same details, with the postcode,
-- as submitted (a later profile edit never rewrites it), and P2's planning
-- facts about this one kitchen. Older requests read as "no answer".
ALTER TABLE app.quote_request
  ADD COLUMN contact_salutation text NOT NULL DEFAULT ''
    CHECK (contact_salutation IN ('', 'frau', 'herr', 'divers')),
  ADD COLUMN contact_title text NOT NULL DEFAULT ''
    CHECK (char_length(contact_title) <= 40),
  ADD COLUMN contact_postal_code text NOT NULL DEFAULT ''
    CHECK (contact_postal_code = '' OR contact_postal_code ~ '^[A-Z0-9][A-Z0-9 -]{1,8}[A-Z0-9]$'),
  ADD COLUMN contact_channel text NOT NULL DEFAULT ''
    CHECK (contact_channel IN ('', 'phone', 'email', 'either')),
  ADD COLUMN contact_time text NOT NULL DEFAULT ''
    CHECK (contact_time IN ('', 'morning', 'afternoon', 'evening', 'anytime')),
  ADD COLUMN customer_type text NOT NULL DEFAULT ''
    CHECK (customer_type IN ('', 'private', 'professional')),
  ADD COLUMN company text NOT NULL DEFAULT ''
    CHECK (char_length(company) <= 120),
  ADD COLUMN professional_role text NOT NULL DEFAULT ''
    CHECK (professional_role IN ('', 'architecture', 'developer', 'trade', 'other')),
  ADD COLUMN project_kind text NOT NULL DEFAULT ''
    CHECK (project_kind IN ('', 'new-build', 'renovation', 'move', 'other')),
  ADD COLUMN timeframe text NOT NULL DEFAULT ''
    CHECK (timeframe IN ('', 'within-3-months', '3-6-months', '6-12-months', 'later', 'open')),
  ADD COLUMN budget_band text NOT NULL DEFAULT ''
    CHECK (budget_band IN ('', 'up-to-10k', '10-15k', '15-25k', 'over-25k')),
  ADD COLUMN wall_length_cm integer
    CHECK (wall_length_cm IS NULL OR wall_length_cm BETWEEN 100 AND 2000),
  ADD CONSTRAINT quote_request_phone_for_calls
    CHECK (contact_channel <> 'phone' OR contact_phone IS NOT NULL),
  ADD CONSTRAINT quote_request_company_for_professionals
    CHECK (CASE WHEN customer_type = 'professional' THEN company <> ''
                ELSE company = '' AND professional_role = '' END);

-- migrate:down

ALTER TABLE app.quote_request
  DROP CONSTRAINT IF EXISTS quote_request_company_for_professionals,
  DROP CONSTRAINT IF EXISTS quote_request_phone_for_calls,
  DROP COLUMN IF EXISTS wall_length_cm,
  DROP COLUMN IF EXISTS budget_band,
  DROP COLUMN IF EXISTS timeframe,
  DROP COLUMN IF EXISTS project_kind,
  DROP COLUMN IF EXISTS professional_role,
  DROP COLUMN IF EXISTS company,
  DROP COLUMN IF EXISTS customer_type,
  DROP COLUMN IF EXISTS contact_time,
  DROP COLUMN IF EXISTS contact_channel,
  DROP COLUMN IF EXISTS contact_postal_code,
  DROP COLUMN IF EXISTS contact_title,
  DROP COLUMN IF EXISTS contact_salutation;

ALTER TABLE app.customer_profile
  DROP CONSTRAINT IF EXISTS customer_profile_company_for_professionals,
  DROP CONSTRAINT IF EXISTS customer_profile_phone_for_calls,
  DROP COLUMN IF EXISTS professional_role,
  DROP COLUMN IF EXISTS company,
  DROP COLUMN IF EXISTS customer_type,
  DROP COLUMN IF EXISTS contact_time,
  DROP COLUMN IF EXISTS contact_channel,
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS salutation;
