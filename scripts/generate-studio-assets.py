"""Generates the studio's synthetic light environment and the fine surface tiles.

Everything here is authored, not downloaded: a soft photo-studio HDRI with
three softboxes and a rim panel over a graded backdrop, a tileable
micro-surface bump for lacquer and Fenix fronts, and a fine-stone quartz
worktop (albedo + roughness). Run: python3 scripts/generate-studio-assets.py
"""

from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
HDRI = ROOT / "public" / "hdri" / "studio-soft.hdr"
TEXTURES = ROOT / "public" / "textures"


def smoothstep(edge0: float, edge1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def periodic_value_noise(size: int, cells: int, rng: np.random.Generator) -> np.ndarray:
    """Bilinear value noise on a cells×cells lattice that wraps at the edges."""
    grid = rng.random((cells, cells))
    xs = np.linspace(0, cells, size, endpoint=False)
    x0 = np.floor(xs).astype(int) % cells
    x1 = (x0 + 1) % cells
    fx = smoothstep(0.0, 1.0, xs - np.floor(xs))
    top = grid[x0[:, None], x0[None, :]]
    right = grid[x0[:, None], x1[None, :]]
    bottom = grid[x1[:, None], x0[None, :]]
    corner = grid[x1[:, None], x1[None, :]]
    a = top + (right - top) * fx[None, :]
    b = bottom + (corner - bottom) * fx[None, :]
    return a + (b - a) * fx[:, None]


def fractal_noise(size: int, seed: int, octaves: tuple[int, ...], gain: float = 0.5) -> np.ndarray:
    rng = np.random.default_rng(seed)
    total = np.zeros((size, size))
    weight = 1.0
    norm = 0.0
    for cells in octaves:
        total += periodic_value_noise(size, cells, rng) * weight
        norm += weight
        weight *= gain
    return total / norm


def write_rgbe(path: Path, rgb: np.ndarray) -> None:
    """Radiance .hdr, flat scanlines (three's RGBELoader reads them)."""
    height, width, _ = rgb.shape
    maximum = rgb.max(axis=2)
    exponent = np.where(maximum > 1e-32, np.floor(np.log2(np.maximum(maximum, 1e-32))) + 1, 0)
    scale = np.where(maximum > 1e-32, 256.0 / np.exp2(exponent), 0.0)
    mantissa = np.clip(np.floor(rgb * scale[..., None]), 0, 255).astype(np.uint8)
    e = np.where(maximum > 1e-32, exponent + 128, 0).astype(np.uint8)
    data = np.concatenate([mantissa, e[..., None]], axis=2)
    header = f"#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y {height} +X {width}\n".encode("ascii")
    path.write_bytes(header + data.tobytes())


def softbox(u: np.ndarray, v: np.ndarray, cu: float, cv: float, wu: float, wv: float, edge: float) -> np.ndarray:
    """A rectangle in equirect space with soft edges; wraps in azimuth."""
    du = np.abs(((u - cu + 0.5) % 1.0) - 0.5)
    dv = np.abs(v - cv)
    inner_u = 1.0 - smoothstep(wu - edge, wu + edge, du)
    inner_v = 1.0 - smoothstep(wv - edge, wv + edge, dv)
    return inner_u * inner_v


def halo(u: np.ndarray, v: np.ndarray, cu: float, cv: float, radius: float) -> np.ndarray:
    du = ((u - cu + 0.5) % 1.0) - 0.5
    dv = v - cv
    return np.exp(-(du * du + dv * dv) / (2 * radius * radius))


def studio_hdri(width: int = 768, height: int = 384) -> np.ndarray:
    u = (np.arange(width) + 0.5) / width
    v = (np.arange(height) + 0.5) / height  # 1 = zenith, 0 = nadir
    U, V = np.meshgrid(u, 1.0 - v)

    # The graded backdrop: near-black floor, a warm grey horizon, a lighter
    # cool ceiling — what a cyclorama looks like between the lights.
    floor = np.array([0.030, 0.029, 0.028])
    horizon = np.array([0.22, 0.21, 0.20])
    zenith = np.array([0.42, 0.44, 0.47])
    t_low = smoothstep(0.30, 0.52, V)
    t_high = smoothstep(0.52, 0.95, V)
    base = floor[None, None] + (horizon - floor)[None, None] * t_low[..., None]
    base = base + (zenith - horizon)[None, None] * t_high[..., None]

    rgb = base.copy()

    def add(mask: np.ndarray, colour: tuple[float, float, float], power: float) -> None:
        nonlocal rgb
        rgb = rgb + mask[..., None] * np.array(colour)[None, None] * power

    # Camera looks toward -z; +z is u≈0.75, -x (camera-left) is u≈0/1, +x is u≈0.5.
    # Key: large warm softbox, front-left, high.
    add(softbox(U, V, 0.86, 0.71, 0.075, 0.11, 0.035), (1.00, 0.93, 0.84), 5.2)
    add(halo(U, V, 0.86, 0.71, 0.16), (1.00, 0.93, 0.84), 0.55)
    # Fill: cooler, front-right, lower, wider and softer.
    add(softbox(U, V, 0.61, 0.60, 0.11, 0.09, 0.05), (0.84, 0.90, 1.00), 1.9)
    add(halo(U, V, 0.61, 0.60, 0.20), (0.84, 0.90, 1.00), 0.35)
    # Top strip: a long panel over the kitchen for the worktop highlight.
    add(softbox(U, V, 0.75, 0.93, 0.22, 0.035, 0.03), (1.00, 0.97, 0.92), 3.4)
    # Rim: behind and above, cool, separates the line from the void.
    add(softbox(U, V, 0.25, 0.80, 0.14, 0.05, 0.04), (0.80, 0.88, 1.00), 2.4)
    add(halo(U, V, 0.25, 0.80, 0.12), (0.80, 0.88, 1.00), 0.3)
    # A dim bounce from the floor side so undersides are not pitch black.
    add(halo(U, V, 0.75, 0.20, 0.25), (0.9, 0.85, 0.8), 0.12)

    return rgb.astype(np.float32)


def micro_surface(size: int = 512) -> Image.Image:
    noise = fractal_noise(size, seed=11, octaves=(8, 16, 32, 64, 128, 256), gain=0.55)
    noise = (noise - noise.min()) / (noise.max() - noise.min())
    return Image.fromarray((noise * 255).astype(np.uint8), mode="L")


def quartz(size: int = 1024) -> tuple[Image.Image, Image.Image]:
    rng = np.random.default_rng(23)
    base = np.array([0.725, 0.706, 0.671])  # #b9b4ab, the stone the fronts sat on
    cloud = fractal_noise(size, seed=5, octaves=(4, 8, 16), gain=0.5) - 0.5
    speck_fine = fractal_noise(size, seed=7, octaves=(128, 256, 512), gain=0.6) - 0.5
    speck_coarse = fractal_noise(size, seed=9, octaves=(64, 128), gain=0.5) - 0.5
    veins_src = fractal_noise(size, seed=13, octaves=(3, 6, 12, 24), gain=0.55)
    veins = np.exp(-((veins_src - 0.5) ** 2) / (2 * 0.012)) * 0.35

    lum = 1.0 + cloud * 0.08 + speck_fine * 0.16 + speck_coarse * 0.06 - veins * 0.10
    sparkle = (rng.random((size, size)) > 0.9985).astype(float) * 0.25
    lum = lum + sparkle
    rgb = np.clip(base[None, None] * lum[..., None], 0, 1)
    # Veins lean a touch cooler than the body.
    rgb[..., 2] = np.clip(rgb[..., 2] + veins * 0.02, 0, 1)
    albedo = Image.fromarray((rgb * 255).astype(np.uint8), mode="RGB")

    rough = 0.36 + speck_fine * 0.18 + cloud * 0.06 - sparkle * 0.25
    roughness = Image.fromarray((np.clip(rough, 0, 1) * 255).astype(np.uint8), mode="L")
    return albedo, roughness


def main() -> None:
    import sys

    TEXTURES.mkdir(parents=True, exist_ok=True)
    outputs = []
    if "--with-hdri" in sys.argv:
        HDRI.parent.mkdir(parents=True, exist_ok=True)
        write_rgbe(HDRI, studio_hdri())
        outputs.append(HDRI)
    micro_surface().save(TEXTURES / "micro-surface.png", optimize=True)
    albedo, roughness = quartz()
    albedo.save(TEXTURES / "worktop-quartz.jpg", quality=88, optimize=True, progressive=True)
    roughness.resize((512, 512), Image.LANCZOS).save(TEXTURES / "worktop-quartz-rough.png", optimize=True)
    outputs += [TEXTURES / "micro-surface.png", TEXTURES / "worktop-quartz.jpg", TEXTURES / "worktop-quartz-rough.png"]
    for path in outputs:
        print(f"{path.relative_to(ROOT)}  {path.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
