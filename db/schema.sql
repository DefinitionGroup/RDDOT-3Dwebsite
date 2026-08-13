\restrict dbmate

-- Dumped from database version 18.4 (c9a59a4)
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: app; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA app;


--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auth_identity; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.auth_identity (
    id uuid NOT NULL,
    customer_account_id uuid NOT NULL,
    provider text NOT NULL,
    provider_subject text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: configuration_revision; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.configuration_revision (
    id uuid NOT NULL,
    project_id uuid NOT NULL,
    normalized_configuration jsonb NOT NULL,
    configuration_hash character(64) NOT NULL,
    schema_version integer NOT NULL,
    product_definition_version text NOT NULL,
    display_snapshot jsonb NOT NULL,
    trigger text NOT NULL,
    label text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT configuration_revision_label_check CHECK (((label IS NULL) OR ((char_length(label) >= 1) AND (char_length(label) <= 120)))),
    CONSTRAINT configuration_revision_normalized_configuration_check CHECK ((jsonb_typeof(normalized_configuration) = 'object'::text)),
    CONSTRAINT configuration_revision_schema_version_check CHECK ((schema_version > 0)),
    CONSTRAINT configuration_revision_trigger_check CHECK ((trigger = ANY (ARRAY['version-save'::text, 'share'::text, 'photo'::text, 'quote'::text])))
);


--
-- Name: customer_account; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.customer_account (
    id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_account_status_check CHECK ((status = ANY (ARRAY['active'::text, 'pending-deletion'::text])))
);


--
-- Name: outbox_message; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.outbox_message (
    id uuid NOT NULL,
    topic text NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    idempotency_key text NOT NULL,
    request_hash character(64) NOT NULL,
    payload jsonb NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    available_at timestamp with time zone DEFAULT now() NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    processed_at timestamp with time zone,
    CONSTRAINT outbox_message_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT outbox_message_payload_check CHECK ((jsonb_typeof(payload) = 'object'::text))
);


--
-- Name: project; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.project (
    id uuid NOT NULL,
    owner_id uuid NOT NULL,
    creation_idempotency_key text NOT NULL,
    name text NOT NULL,
    private_notes text DEFAULT ''::text NOT NULL,
    lifecycle text DEFAULT 'active'::text NOT NULL,
    trashed_at timestamp with time zone,
    deletion_due_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT project_check CHECK ((((lifecycle = 'trashed'::text) AND (trashed_at IS NOT NULL) AND (deletion_due_at IS NOT NULL)) OR ((lifecycle <> 'trashed'::text) AND (trashed_at IS NULL) AND (deletion_due_at IS NULL)))),
    CONSTRAINT project_lifecycle_check CHECK ((lifecycle = ANY (ARRAY['active'::text, 'archived'::text, 'trashed'::text]))),
    CONSTRAINT project_name_check CHECK (((char_length(name) >= 1) AND (char_length(name) <= 120)))
);


--
-- Name: working_configuration; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.working_configuration (
    project_id uuid NOT NULL,
    normalized_configuration jsonb NOT NULL,
    configuration_hash character(64) NOT NULL,
    schema_version integer NOT NULL,
    product_definition_version text NOT NULL,
    version bigint DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT working_configuration_normalized_configuration_check CHECK ((jsonb_typeof(normalized_configuration) = 'object'::text)),
    CONSTRAINT working_configuration_schema_version_check CHECK ((schema_version > 0)),
    CONSTRAINT working_configuration_version_check CHECK ((version > 0))
);


--
-- Name: account; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.account (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: rateLimit; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth."rateLimit" (
    id text NOT NULL,
    key text NOT NULL,
    count integer NOT NULL,
    "lastRequest" bigint NOT NULL,
    CONSTRAINT "rateLimit_count_check" CHECK ((count >= 0)),
    CONSTRAINT "rateLimit_lastRequest_check" CHECK (("lastRequest" >= 0))
);


--
-- Name: session; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.session (
    id text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL
);


--
-- Name: user; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: verification; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: playing_with_neon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playing_with_neon (
    id integer NOT NULL,
    name text NOT NULL,
    value real
);


--
-- Name: playing_with_neon_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.playing_with_neon_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: playing_with_neon_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.playing_with_neon_id_seq OWNED BY public.playing_with_neon.id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: playing_with_neon id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playing_with_neon ALTER COLUMN id SET DEFAULT nextval('public.playing_with_neon_id_seq'::regclass);


--
-- Name: auth_identity auth_identity_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.auth_identity
    ADD CONSTRAINT auth_identity_pkey PRIMARY KEY (id);


--
-- Name: auth_identity auth_identity_provider_provider_subject_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.auth_identity
    ADD CONSTRAINT auth_identity_provider_provider_subject_key UNIQUE (provider, provider_subject);


--
-- Name: configuration_revision configuration_revision_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.configuration_revision
    ADD CONSTRAINT configuration_revision_pkey PRIMARY KEY (id);


--
-- Name: configuration_revision configuration_revision_project_id_schema_version_product_de_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.configuration_revision
    ADD CONSTRAINT configuration_revision_project_id_schema_version_product_de_key UNIQUE (project_id, schema_version, product_definition_version, configuration_hash);


--
-- Name: customer_account customer_account_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.customer_account
    ADD CONSTRAINT customer_account_pkey PRIMARY KEY (id);


--
-- Name: outbox_message outbox_message_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.outbox_message
    ADD CONSTRAINT outbox_message_pkey PRIMARY KEY (id);


--
-- Name: outbox_message outbox_message_topic_idempotency_key_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.outbox_message
    ADD CONSTRAINT outbox_message_topic_idempotency_key_key UNIQUE (topic, idempotency_key);


--
-- Name: project project_owner_id_creation_idempotency_key_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project
    ADD CONSTRAINT project_owner_id_creation_idempotency_key_key UNIQUE (owner_id, creation_idempotency_key);


--
-- Name: project project_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project
    ADD CONSTRAINT project_pkey PRIMARY KEY (id);


--
-- Name: working_configuration working_configuration_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.working_configuration
    ADD CONSTRAINT working_configuration_pkey PRIMARY KEY (project_id);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: rateLimit rateLimit_key_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth."rateLimit"
    ADD CONSTRAINT "rateLimit_key_key" UNIQUE (key);


--
-- Name: rateLimit rateLimit_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth."rateLimit"
    ADD CONSTRAINT "rateLimit_pkey" PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: playing_with_neon playing_with_neon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playing_with_neon
    ADD CONSTRAINT playing_with_neon_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: auth_identity_customer_account_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX auth_identity_customer_account_idx ON app.auth_identity USING btree (customer_account_id);


--
-- Name: configuration_revision_project_created_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX configuration_revision_project_created_idx ON app.configuration_revision USING btree (project_id, created_at DESC);


--
-- Name: outbox_message_delivery_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX outbox_message_delivery_idx ON app.outbox_message USING btree (available_at, occurred_at) WHERE (processed_at IS NULL);


--
-- Name: project_owner_lifecycle_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX project_owner_lifecycle_idx ON app.project USING btree (owner_id, lifecycle, updated_at DESC);


--
-- Name: account_userId_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "account_userId_idx" ON auth.account USING btree ("userId");


--
-- Name: session_userId_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX "session_userId_idx" ON auth.session USING btree ("userId");


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX verification_identifier_idx ON auth.verification USING btree (identifier);


--
-- Name: auth_identity auth_identity_customer_account_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.auth_identity
    ADD CONSTRAINT auth_identity_customer_account_id_fkey FOREIGN KEY (customer_account_id) REFERENCES app.customer_account(id) ON DELETE CASCADE;


--
-- Name: configuration_revision configuration_revision_project_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.configuration_revision
    ADD CONSTRAINT configuration_revision_project_id_fkey FOREIGN KEY (project_id) REFERENCES app.project(id) ON DELETE CASCADE;


--
-- Name: project project_owner_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project
    ADD CONSTRAINT project_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES app.customer_account(id) ON DELETE CASCADE;


--
-- Name: working_configuration working_configuration_project_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.working_configuration
    ADD CONSTRAINT working_configuration_project_id_fkey FOREIGN KEY (project_id) REFERENCES app.project(id) ON DELETE CASCADE;


--
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES auth."user"(id) ON DELETE CASCADE;


--
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES auth."user"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20260813120000'),
    ('20260813123000'),
    ('20260813230000');
