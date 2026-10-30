# Texture and environment weight

Status: done (2026-10-30)
Audit: P4

## Scope

The Studio loads a 1.46 MB HDR (`/hdri/brown-photostudio-02.hdr`), 1.6 MB of floor
textures as JPEG (`wood-floor-diff.jpg` 1.06 MB, `wood-floor-normal.jpg` 0.56 MB) and the
walnut swatch as a 0.69 MB PNG (`/images/material-walnut-memory-wn832.png`) up front.
Options: the swatch as WebP/AVIF through `next/image` and only when shown; smaller floor
textures or KTX2; a smaller or prefiltered environment map. These change the rendered
picture, so each needs a before/after comparison (ADR 0009's reference renders do not
exist yet).

## Done

- Finish scans as JPEG (mozjpeg q88): walnut 684 → 28 KB, Verde Kitami 260 → 10 KB, Castoro
  Ottawa 58 → 4 KB. `product-definition.ts` points the 3D fronts and the swatches at them; the
  PNGs stay for the homepage's demo content, which `next/image` already shrinks. They still
  load up front: at 42 KB together, loading one on choice would only add a wait to the switch.
- Wood floor diffuse and normal at 1024 px (198 and 56 KB); the 1024 px roughness map is
  unchanged.
- Studio HDRI at 512 × 256, box-filtered so the light keeps its strength: 2.1 MB → 0.41 MB,
  about 0.3 MB compressed. A gain-map JPEG would be smaller still, but drei decodes it into a
  render target without pixel data, which the path tracer behind photos cannot sample.

Comparison: the same build rendered with old and new files, Chrome on the real GPU, Studio
from three cameras, the walnut front, Appartement, Loft and the phone. Two runs with the same
files differ by 62 dB PSNR or more; the new files stay within 46 dB on the floor close-up, 49
dB on the room's floor and 50 dB on the walnut front: no difference a viewer can see. A 1536
px floor came out further from the original (44 dB), because its mip levels do not line up
with the 2048 px original's. The configurator's first 15 s on the phone profile: about 2.5
MB at Vercel's compression, from 5.9 MB. Not compared: path-traced photos, which read the
same HDR.
