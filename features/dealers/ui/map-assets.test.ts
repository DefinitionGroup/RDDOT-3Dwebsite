import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAPLIBRE_WORKER_URL } from "@/features/dealers/ui/map-style";

describe("self-hosted map assets", () => {
  it("serves the MapLibre worker of the installed version", () => {
    const { version } = JSON.parse(
      readFileSync("node_modules/maplibre-gl/package.json", "utf8")
    ) as { version: string };
    expect(MAPLIBRE_WORKER_URL).toBe(`/map/maplibre-gl-worker-${version}.mjs`);
    expect(existsSync(`public${MAPLIBRE_WORKER_URL}`)).toBe(true);
  });

  it("carries the glyphs the basemap style names, with their licence", () => {
    for (const font of ["Noto Sans Regular", "Noto Sans Medium", "Noto Sans Italic"]) {
      for (const range of ["0-255", "256-511", "8192-8447"]) {
        expect(existsSync(`public/map/fonts/${font}/${range}.pbf`)).toBe(true);
      }
    }
    expect(existsSync("public/map/fonts/OFL.txt")).toBe(true);
  });
});
