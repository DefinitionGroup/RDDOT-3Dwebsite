import { NextResponse } from "next/server";
import { getMapTileArchive } from "@/lib/server/map/map-tiles";

export const runtime = "nodejs";

/**
 * TileJSON for the Dealer Directory's map, or 204 when this deployment has no
 * tile archive: no map is no error, the list carries on (ADR 0014).
 */
export async function GET(request: Request) {
  const archive = getMapTileArchive();
  const info = await archive?.info().catch(() => null);
  if (!archive || !info) return new Response(null, { status: 204 });

  const origin = new URL(request.url).origin;
  return NextResponse.json(
    {
      tilejson: "3.0.0",
      tiles: [`${origin}/api/map/tiles/{z}/{x}/{y}?v=${encodeURIComponent(archive.version)}`],
      minzoom: info.minZoom,
      maxzoom: info.maxZoom,
      bounds: info.bounds,
      center: info.center,
      attribution: "© OpenStreetMap"
    },
    { headers: { "cache-control": "public, max-age=3600" } }
  );
}
