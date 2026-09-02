-- migrate:up

-- PLAN.md Phase 4 (ADR 0008, gaps G6–G8): every execution is attributable to
-- an approved, immutable Prompt Template Release and Model Release
-- (CONTEXT.md), and each job carries the evidence of what ran and what it was
-- estimated to cost. Rows are never updated; a change is a new version.

CREATE TABLE app.prompt_template_release (
  id uuid PRIMARY KEY,
  key text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  -- Placeholders such as {{frontLabel}} are filled from the pinned revision's
  -- product facts and the chosen Scene Preset; never from client input.
  template text NOT NULL CHECK (char_length(template) BETWEEN 1 AND 4000),
  -- The approved, customer-selectable Scene Presets of this release.
  scene_presets jsonb NOT NULL CHECK (jsonb_typeof(scene_presets) = 'array'),
  active boolean NOT NULL DEFAULT false,
  approved_by text NOT NULL,
  approved_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, version)
);

CREATE UNIQUE INDEX prompt_template_release_active_idx
  ON app.prompt_template_release (active)
  WHERE active;

CREATE TABLE app.model_release (
  id uuid PRIMARY KEY,
  provider text NOT NULL,
  model_identifier text NOT NULL,
  version_label text NOT NULL,
  license text NOT NULL,
  expectations jsonb NOT NULL CHECK (jsonb_typeof(expectations) = 'object'),
  safety_notes text NOT NULL,
  pricing_basis text NOT NULL,
  estimated_cost_cents integer NOT NULL CHECK (estimated_cost_cents >= 0),
  evaluation_evidence text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  approved_by text NOT NULL,
  approved_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, model_identifier, version_label)
);

CREATE UNIQUE INDEX model_release_active_idx
  ON app.model_release (active)
  WHERE active;

ALTER TABLE app.photo_job
  ADD COLUMN prompt_template_release_id uuid REFERENCES app.prompt_template_release(id),
  ADD COLUMN model_release_id uuid REFERENCES app.model_release(id),
  -- The assembled prompt as sent: product facts and the Scene Preset only.
  ADD COLUMN prompt_text text,
  ADD COLUMN estimated_cost_cents integer CHECK (estimated_cost_cents >= 0),
  ADD COLUMN provider_duration_ms integer CHECK (provider_duration_ms >= 0);

CREATE INDEX photo_job_submitted_idx
  ON app.photo_job (submitted_at DESC)
  WHERE submitted_at IS NOT NULL;

-- Release v1 of both records the standing product decisions: the in-code
-- prompt template and presets of 2026-08-27, and the unversioned official
-- model chosen on the same day (PLAN.md). The live runs of 2026-09-02 are
-- the evaluation evidence on file.
INSERT INTO app.prompt_template_release
  (id, key, version, template, scene_presets, active, approved_by, approved_at)
VALUES (
  '5a6c1c8e-2c1f-4c33-9a0e-0d2f7f1e0001',
  'signature-kitchen-photo',
  1,
  'This is a rendered 3D model of a kitchen. Turn it into a photorealistic photograph of the exact same kitchen. The kitchen fronts are {{frontLabel}} with a {{frontMaterial}} finish. The cabinet body is {{cabinetLabel}}. Fill in the sink on the island and add ovens and a microwave in the tall cabinets behind it. {{scene}} Keep the perspective and the camera angle of the input image. Hyperrealistic, cinematic, professional interior photography.',
  '[
    {"key": "beach-villa", "label": {"de": "Strandvilla Sonnenuntergang", "en": "Beach villa sunset", "es": "Villa de playa al atardecer"}, "scene": "Place this kitchen on the wooden bankirai terrace of a Gran Canaria beach villa with a lot of glass and stone. Huge windows let us view the surroundings on the beach with mountains in the background. The time is sunset, 19:00, warm golden light."},
    {"key": "urban-loft", "label": {"de": "Urban Loft", "en": "Urban loft", "es": "Loft urbano"}, "scene": "Place this kitchen in a spacious industrial loft with polished concrete floors, exposed brick and black steel-framed factory windows. City skyline at dusk outside, warm interior lighting mixing with blue hour light."},
    {"key": "nordic-morning", "label": {"de": "Nordischer Morgen", "en": "Nordic morning", "es": "Mañana nórdica"}, "scene": "Place this kitchen in a minimalist Scandinavian house with pale wood floors and white walls. Floor-to-ceiling windows show a calm fjord and pine forest outside. Soft diffused morning light, slightly misty."},
    {"key": "mediterranean-patio", "label": {"de": "Mediterrane Terrasse", "en": "Mediterranean patio", "es": "Patio mediterráneo"}, "scene": "Place this kitchen in an open Mediterranean courtyard with natural stone walls, terracotta floor tiles and olive trees. Warm late-afternoon sunlight casts long soft shadows, a hint of the sea in the distance."}
  ]'::jsonb,
  true,
  'Product owner (Martin): prompt and Scene Presets as decided 2026-08-27, recorded by this migration',
  '2026-08-27T00:00:00Z'
);

INSERT INTO app.model_release
  (id, provider, model_identifier, version_label, license, expectations, safety_notes,
   pricing_basis, estimated_cost_cents, evaluation_evidence, active, approved_by, approved_at)
VALUES (
  '7b2e9d54-4f7a-4e2a-8c3d-1e5b9a2c0001',
  'replicate',
  'qwen/qwen-image-2-pro',
  'official-unversioned',
  'Replicate official model under the provider''s terms of service; output usage per those terms. Scoped exception of ADR 0008; production activation gated by Phase 6.',
  '{"input": {"image": "HTTPS URL to a JPEG or PNG the provider can fetch without credentials", "aspect_ratio": "16:9"}, "output": {"images": 1, "observed": "1024x576 PNG"}}'::jsonb,
  'Provider-side content filtering only. The application''s own output moderation gate (G10) is not yet in place; outputs are decoded and dimension-checked before storage.',
  'Per output image (provider list price at approval time); failed predictions observed unbilled.',
  5,
  'Live runs 2026-09-02: k449ce4yphrmt0d0cc89v8msqw and 500438hh8nrmr0d0ccaryy52mm failed on unreachable input URLs (diagnosed, fixed); rpbj81t445rmw0d0ccc867s3nc succeeded in 17 s with a usable 1024x576 photo.',
  true,
  'Product owner (Martin): "unversioned official models" decision of 2026-08-27, recorded by this migration',
  '2026-08-27T00:00:00Z'
);

-- migrate:down

DROP INDEX IF EXISTS app.photo_job_submitted_idx;
ALTER TABLE app.photo_job
  DROP COLUMN IF EXISTS prompt_template_release_id,
  DROP COLUMN IF EXISTS model_release_id,
  DROP COLUMN IF EXISTS prompt_text,
  DROP COLUMN IF EXISTS estimated_cost_cents,
  DROP COLUMN IF EXISTS provider_duration_ms;
DROP TABLE IF EXISTS app.model_release;
DROP TABLE IF EXISTS app.prompt_template_release;
