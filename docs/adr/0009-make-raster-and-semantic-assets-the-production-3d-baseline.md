---
status: accepted
---

# Make raster and semantic assets the production 3D baseline

rotpunkt Signature will treat stable raster WebGL2 rendering from validated semantic assets as the canonical interactive product view. The engine consumes an application-owned Render Specification resolved from a Kitchen Configuration and its pinned Release Bundle. It will not infer product meaning from mesh geometry or authoring-tool names, query external systems, or treat presentation state as configuration truth.

Production assets are immutable and content-hashed. Their Asset Manifest maps required Semantic Scene Roles to explicit nodes and material slots, declares engine and render-contract compatibility, provides approved cameras and deterministic fallbacks, and records checksums, budgets, runtime requirements, license, and provenance. Missing or incompatible required roles block release rather than receiving heuristic or default substitutions.

## Consequences

The current generic kitchen GLB and oversized apartment GLB remain prototype assets. Production requires prepared semantic models and measured quality variants. The Studio Scene is canonical; atmospheric scenes and path tracing are optional deferred enhancements that cannot alter product meaning or block configuration.

Quality Profiles use runtime capability and observed stability rather than viewport width alone. Fidelity may change but selectable parts, silhouettes, finish identity, visibility, and semantic roles remain equivalent. Unsupported or unstable sessions preserve the full workflow through a Deterministic Visual Fallback.

Release Candidate validation enforces immutable dependency closure, semantic mappings, geometry and texture correctness, explicit transfer/GPU/triangle/draw-call budgets, camera and fallback coverage, supported configurations, and browser render smoke tests. Deterministic reference renders and human approval govern visual change. Engine upgrades cannot silently reinterpret historical manifests; approved fallback imagery preserves historical understanding when old interactive rendering is no longer safe.

Source Captures use ready stable raster output, approved cameras, and recorded release, manifest, renderer, profile, setting, and checksum provenance. The canvas remains supplemental to accessible controls and summaries. Privacy-safe telemetry measures capability, performance, failure, fallback, context-loss, compatibility, and capture readiness without collecting configurations or imagery.
