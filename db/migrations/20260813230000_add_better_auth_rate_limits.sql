-- Generated from Better Auth 1.6.27 after enabling database-backed rate
-- limits, then reviewed and schema-qualified for dbmate.

-- migrate:up

CREATE TABLE auth."rateLimit" (
  "id" text PRIMARY KEY,
  "key" text NOT NULL UNIQUE,
  "count" integer NOT NULL CHECK ("count" >= 0),
  "lastRequest" bigint NOT NULL CHECK ("lastRequest" >= 0)
);

-- migrate:down

DROP TABLE IF EXISTS auth."rateLimit";
