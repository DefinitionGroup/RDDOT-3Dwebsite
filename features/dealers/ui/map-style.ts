import { layers, namedFlavor } from "@protomaps/basemaps";
import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import maplibrePackage from "maplibre-gl/package.json";

/** MapLibre's worker, served from `public/map` because the bundler cannot serve it from the package. */
export const MAPLIBRE_WORKER_URL = `/map/maplibre-gl-worker-${maplibrePackage.version}.mjs`;

/** What `/api/map/tiles` answers when this deployment has a tile archive. */
export type TileJson = {
  tiles: string[];
  minzoom: number;
  maxzoom: number;
  bounds: [number, number, number, number];
};

/**
 * There is no sprite sheet: layers that are only icons go, layers that pair an
 * icon with a label keep the label.
 */
function withoutIcons(layer: LayerSpecification): LayerSpecification | null {
  const layout = "layout" in layer ? (layer.layout as Record<string, unknown> | undefined) : undefined;
  if (!layout || !("icon-image" in layout)) return layer;
  if (!("text-field" in layout)) return null;
  const textOnly = Object.fromEntries(
    Object.entries(layout).filter(([property]) => !property.startsWith("icon-"))
  );
  return { ...layer, layout: textOnly } as LayerSpecification;
}

/**
 * The Protomaps basemap in its black flavour, which already sits on the
 * site's palette (soot land, graphite labels), with labels in the page's
 * language and glyphs from `public/map/fonts`. Everything it loads comes from
 * this site (ADR 0014).
 */
export function dealerMapStyle(tileJson: TileJson, lang: string, attribution: string): StyleSpecification {
  return {
    version: 8,
    glyphs: "/map/fonts/{fontstack}/{range}.pbf",
    sources: {
      protomaps: {
        type: "vector",
        tiles: tileJson.tiles,
        minzoom: tileJson.minzoom,
        maxzoom: tileJson.maxzoom,
        bounds: tileJson.bounds,
        attribution
      }
    },
    layers: layers("protomaps", namedFlavor("black"), { lang })
      .map(withoutIcons)
      .filter((layer): layer is LayerSpecification => layer !== null)
  };
}
