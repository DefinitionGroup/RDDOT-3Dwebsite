# Texture and environment weight

Status: needs-triage
Audit: P4

## Scope

The Studio loads a 1.46 MB HDR (`/hdri/brown-photostudio-02.hdr`), 1.6 MB of floor
textures as JPEG (`wood-floor-diff.jpg` 1.06 MB, `wood-floor-normal.jpg` 0.56 MB) and the
walnut swatch as a 0.69 MB PNG (`/images/material-walnut-memory-wn832.png`) up front.
Options: the swatch as WebP/AVIF through `next/image` and only when shown; smaller floor
textures or KTX2; a smaller or prefiltered environment map. These change the rendered
picture, so each needs a before/after comparison (ADR 0009's reference renders do not
exist yet).
