import { NextResponse } from "next/server";
import { getMapTileArchive } from "@/lib/server/map/map-tiles";

export const runtime = "nodejs";

function coordinate(value: string) {
  return /^\d{1,7}$/.test(value) ? Number(value) : null;
}

/**
 * One vector tile of the self-hosted OpenStreetMap archive (ADR 0014). Tiles
 * hold no personal data, so shared caches may keep them; the TileJSON names
 * the archive in every tile URL, so a new archive gets new addresses.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const archive = getMapTileArchive();
  if (!archive) return NextResponse.json({ code: "not-found" }, { status: 404 });

  const params = await context.params;
  const [z, x, y] = [coordinate(params.z), coordinate(params.x), coordinate(params.y)];
  if (z === null || x === null || y === null || z > 22 || x >= 2 ** z || y >= 2 ** z) {
    return NextResponse.json({ code: "invalid-request" }, { status: 400 });
  }

  const tile = await archive.tile(z, x, y);
  // No tile is an empty one, which the map draws as nothing.
  if (!tile) return new Response(null, { status: 204, headers: { "cache-control": "public, max-age=86400" } });
  return new Response(tile, {
    headers: {
      "content-type": "application/vnd.mapbox-vector-tile",
      "cache-control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800"
    }
  });
}
