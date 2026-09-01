\restrict dbmate

-- Dumped from database version 18.6 (c5250a2)
-- Dumped by pg_dump version 18.6

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


--
-- Name: enqueue_storage_object_deletion(); Type: FUNCTION; Schema: app; Owner: -
--

CREATE FUNCTION app.enqueue_storage_object_deletion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.storage_key IS NULL THEN
    RETURN OLD;
  END IF;

  INSERT INTO app.outbox_message (
    id, topic, aggregate_type, aggregate_id,
    idempotency_key, request_hash, payload
  )
  VALUES (
    gen_random_uuid(),
    'storage.object.delete',
    TG_ARGV[0],
    OLD.id,
    OLD.storage_key,
    encode(sha256(OLD.storage_key::bytea), 'hex'),
    jsonb_build_object('storageKey', OLD.storage_key)
  )
  ON CONFLICT (topic, idempotency_key) DO NOTHING;

  RETURN OLD;
END;
$$;


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
-- Name: generated_photo; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.generated_photo (
    id uuid NOT NULL,
    photo_job_id uuid NOT NULL,
    project_id uuid NOT NULL,
    configuration_revision_id uuid NOT NULL,
    storage_key text NOT NULL,
    content_type text NOT NULL,
    byte_size integer NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT generated_photo_byte_size_check CHECK ((byte_size > 0)),
    CONSTRAINT generated_photo_content_type_check CHECK ((content_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text]))),
    CONSTRAINT generated_photo_height_check CHECK ((height > 0)),
    CONSTRAINT generated_photo_width_check CHECK ((width > 0))
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
-- Name: photo_job; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.photo_job (
    id uuid NOT NULL,
    project_id uuid NOT NULL,
    configuration_revision_id uuid NOT NULL,
    source_capture_id uuid,
    scene_preset_key text NOT NULL,
    state text DEFAULT 'requested'::text NOT NULL,
    creation_idempotency_key text NOT NULL,
    request_hash character(64) NOT NULL,
    provider_reference text,
    failure_reason text,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    terminal_at timestamp with time zone,
    CONSTRAINT photo_job_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT photo_job_check CHECK (((state = ANY (ARRAY['succeeded'::text, 'failed'::text, 'canceled'::text])) = (terminal_at IS NOT NULL))),
    CONSTRAINT photo_job_check1 CHECK (((state = ANY (ARRAY['requested'::text, 'canceled'::text, 'failed'::text])) OR (source_capture_id IS NOT NULL))),
    CONSTRAINT photo_job_state_check CHECK ((state = ANY (ARRAY['requested'::text, 'capture-ready'::text, 'submitted'::text, 'running'::text, 'validating'::text, 'uncertain'::text, 'canceling'::text, 'succeeded'::text, 'failed'::text, 'canceled'::text])))
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
-- Name: shared_revision_link; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.shared_revision_link (
    id uuid NOT NULL,
    project_id uuid NOT NULL,
    configuration_revision_id uuid NOT NULL,
    token_hash character(64) NOT NULL,
    creation_idempotency_key text NOT NULL,
    request_hash character(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shared_revision_link_check CHECK ((expires_at > created_at)),
    CONSTRAINT shared_revision_link_check1 CHECK (((revoked_at IS NULL) OR (revoked_at >= created_at)))
);


--
-- Name: source_capture; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.source_capture (
    id uuid NOT NULL,
    project_id uuid NOT NULL,
    configuration_revision_id uuid NOT NULL,
    storage_key text NOT NULL,
    content_type text NOT NULL,
    max_byte_size integer NOT NULL,
    byte_size integer,
    width integer,
    height integer,
    status text DEFAULT 'reserved'::text NOT NULL,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    stored_at timestamp with time zone,
    CONSTRAINT source_capture_byte_size_check CHECK ((byte_size > 0)),
    CONSTRAINT source_capture_check CHECK ((((status = 'stored'::text) AND (byte_size IS NOT NULL) AND (width IS NOT NULL) AND (height IS NOT NULL) AND (stored_at IS NOT NULL)) OR ((status <> 'stored'::text) AND (byte_size IS NULL) AND (width IS NULL) AND (height IS NULL) AND (stored_at IS NULL)))),
    CONSTRAINT source_capture_check1 CHECK (((status = 'rejected'::text) = (rejection_reason IS NOT NULL))),
    CONSTRAINT source_capture_content_type_check CHECK ((content_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text]))),
    CONSTRAINT source_capture_height_check CHECK ((height > 0)),
    CONSTRAINT source_capture_max_byte_size_check CHECK ((max_byte_size > 0)),
    CONSTRAINT source_capture_status_check CHECK ((status = ANY (ARRAY['reserved'::text, 'stored'::text, 'rejected'::text]))),
    CONSTRAINT source_capture_width_check CHECK ((width > 0))
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
-- Name: configuration_revision configuration_revision_project_id_id_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.configuration_revision
    ADD CONSTRAINT configuration_revision_project_id_id_key UNIQUE (project_id, id);


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
-- Name: generated_photo generated_photo_photo_job_id_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.generated_photo
    ADD CONSTRAINT generated_photo_photo_job_id_key UNIQUE (photo_job_id);


--
-- Name: generated_photo generated_photo_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.generated_photo
    ADD CONSTRAINT generated_photo_pkey PRIMARY KEY (id);


--
-- Name: generated_photo generated_photo_storage_key_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.generated_photo
    ADD CONSTRAINT generated_photo_storage_key_key UNIQUE (storage_key);


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
-- Name: photo_job photo_job_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.photo_job
    ADD CONSTRAINT photo_job_pkey PRIMARY KEY (id);


--
-- Name: photo_job photo_job_project_id_creation_idempotency_key_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.photo_job
    ADD CONSTRAINT photo_job_project_id_creation_idempotency_key_key UNIQUE (project_id, creation_idempotency_key);


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
-- Name: shared_revision_link shared_revision_link_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.shared_revision_link
    ADD CONSTRAINT shared_revision_link_pkey PRIMARY KEY (id);


--
-- Name: shared_revision_link shared_revision_link_project_id_creation_idempotency_key_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.shared_revision_link
    ADD CONSTRAINT shared_revision_link_project_id_creation_idempotency_key_key UNIQUE (project_id, creation_idempotency_key);


--
-- Name: shared_revision_link shared_revision_link_token_hash_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.shared_revision_link
    ADD CONSTRAINT shared_revision_link_token_hash_key UNIQUE (token_hash);


--
-- Name: source_capture source_capture_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.source_capture
    ADD CONSTRAINT source_capture_pkey PRIMARY KEY (id);


--
-- Name: source_capture source_capture_storage_key_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.source_capture
    ADD CONSTRAINT source_capture_storage_key_key UNIQUE (storage_key);


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
-- Name: generated_photo_project_created_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX generated_photo_project_created_idx ON app.generated_photo USING btree (project_id, created_at DESC);


--
-- Name: generated_photo_revision_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX generated_photo_revision_idx ON app.generated_photo USING btree (configuration_revision_id, created_at DESC);


--
-- Name: outbox_message_delivery_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX outbox_message_delivery_idx ON app.outbox_message USING btree (available_at, occurred_at) WHERE (processed_at IS NULL);


--
-- Name: photo_job_in_flight_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX photo_job_in_flight_idx ON app.photo_job USING btree (updated_at) WHERE (state = ANY (ARRAY['submitted'::text, 'running'::text, 'validating'::text, 'uncertain'::text, 'canceling'::text]));


--
-- Name: photo_job_project_created_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX photo_job_project_created_idx ON app.photo_job USING btree (project_id, created_at DESC);


--
-- Name: photo_job_revision_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX photo_job_revision_idx ON app.photo_job USING btree (configuration_revision_id, created_at DESC);


--
-- Name: project_owner_lifecycle_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX project_owner_lifecycle_idx ON app.project USING btree (owner_id, lifecycle, updated_at DESC);


--
-- Name: shared_revision_link_active_expiry_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX shared_revision_link_active_expiry_idx ON app.shared_revision_link USING btree (expires_at) WHERE (revoked_at IS NULL);


--
-- Name: shared_revision_link_project_created_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX shared_revision_link_project_created_idx ON app.shared_revision_link USING btree (project_id, created_at DESC);


--
-- Name: source_capture_project_created_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX source_capture_project_created_idx ON app.source_capture USING btree (project_id, created_at DESC);


--
-- Name: source_capture_reserved_idx; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX source_capture_reserved_idx ON app.source_capture USING btree (created_at) WHERE (status = 'reserved'::text);


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
-- Name: generated_photo generated_photo_enqueue_deletion; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER generated_photo_enqueue_deletion AFTER DELETE ON app.generated_photo FOR EACH ROW EXECUTE FUNCTION app.enqueue_storage_object_deletion('generated-photo');


--
-- Name: source_capture source_capture_enqueue_deletion; Type: TRIGGER; Schema: app; Owner: -
--

CREATE TRIGGER source_capture_enqueue_deletion AFTER DELETE ON app.source_capture FOR EACH ROW EXECUTE FUNCTION app.enqueue_storage_object_deletion('source-capture');


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
-- Name: generated_photo generated_photo_photo_job_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.generated_photo
    ADD CONSTRAINT generated_photo_photo_job_id_fkey FOREIGN KEY (photo_job_id) REFERENCES app.photo_job(id) ON DELETE CASCADE;


--
-- Name: generated_photo generated_photo_project_id_configuration_revision_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.generated_photo
    ADD CONSTRAINT generated_photo_project_id_configuration_revision_id_fkey FOREIGN KEY (project_id, configuration_revision_id) REFERENCES app.configuration_revision(project_id, id) ON DELETE CASCADE;


--
-- Name: photo_job photo_job_project_id_configuration_revision_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.photo_job
    ADD CONSTRAINT photo_job_project_id_configuration_revision_id_fkey FOREIGN KEY (project_id, configuration_revision_id) REFERENCES app.configuration_revision(project_id, id) ON DELETE CASCADE;


--
-- Name: photo_job photo_job_source_capture_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.photo_job
    ADD CONSTRAINT photo_job_source_capture_id_fkey FOREIGN KEY (source_capture_id) REFERENCES app.source_capture(id) ON DELETE RESTRICT;


--
-- Name: project project_owner_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.project
    ADD CONSTRAINT project_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES app.customer_account(id) ON DELETE CASCADE;


--
-- Name: shared_revision_link shared_revision_link_project_id_configuration_revision_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.shared_revision_link
    ADD CONSTRAINT shared_revision_link_project_id_configuration_revision_id_fkey FOREIGN KEY (project_id, configuration_revision_id) REFERENCES app.configuration_revision(project_id, id) ON DELETE CASCADE;


--
-- Name: source_capture source_capture_project_id_configuration_revision_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.source_capture
    ADD CONSTRAINT source_capture_project_id_configuration_revision_id_fkey FOREIGN KEY (project_id, configuration_revision_id) REFERENCES app.configuration_revision(project_id, id) ON DELETE CASCADE;


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
    ('20260813230000'),
    ('20260814110000'),
    ('20260901120000');
