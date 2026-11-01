import "server-only";

import { open } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { FetchSource, PMTiles, type RangeResponse, type Source } from "pmtiles";
import { getObjectStorage } from "@/lib/server/object-storage/object-storage";

// The Dealer Directory's map draws OpenStreetMap vector tiles from one PMTiles
// archive the application serves itself (ADR 0014): from a local file in
// development (`MAP_TILES_FILE`) or from private EU object storage
// (`MAP_TILES_OBJECT_KEY`). Without either, there is no map and the directory
// is a list.

/**
 * Reads byte ranges of an archive on the local disk, opening it for each read:
 * PMTiles caches the directories, so a tile costs one read.
 */
export class FileRangeSource implements Source {
  constructor(private readonly path: string) {}

  getKey() {
    return `file:${this.path}`;
  }

  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    const handle = await open(this.path, "r");
    try {
      const bytes = new Uint8Array(length);
      const { bytesRead } = await handle.read(bytes, 0, length, offset);
      return { data: bytes.buffer.slice(0, bytesRead) };
    } finally {
      await handle.close();
    }
  }
}

type Presign = (key: string) => Promise<{ url: string; expiresAt: Date }>;

/**
 * Reads byte ranges of an archive in the private bucket through a presigned
 * URL, renewed a minute before it expires. The key, not the URL, names the
 * archive, so the directory cache survives a renewal.
 */
export class StorageRangeSource implements Source {
  private current: { source: FetchSource; expiresAt: number } | undefined;

  constructor(
    private readonly key: string,
    private readonly presign: Presign = (key) =>
      getObjectStorage().presignDownload({ key, expiresInSeconds: 3600 })
  ) {}

  getKey() {
    return `storage:${this.key}`;
  }

  async getBytes(offset: number, length: number, signal?: AbortSignal, etag?: string) {
    if (!this.current || this.current.expiresAt - Date.now() < 60_000) {
      const download = await this.presign(this.key);
      this.current = { source: new FetchSource(download.url), expiresAt: download.expiresAt.getTime() };
    }
    return this.current.source.getBytes(offset, length, signal, etag);
  }
}

export type MapTileArchive = {
  /** Names this archive in tile URLs, so a new archive is never served from an old cache. */
  version: string;
  info(): Promise<{
    minZoom: number;
    maxZoom: number;
    bounds: [number, number, number, number];
    center: [number, number, number];
  }>;
  /** The decompressed vector tile, or null where the archive has none. */
  tile(z: number, x: number, y: number): Promise<Uint8Array<ArrayBuffer> | null>;
};

export function createMapTileArchive(source: Source, version: string): MapTileArchive {
  const archive = new PMTiles(source);
  return {
    version,
    async info() {
      const header = await archive.getHeader();
      return {
        minZoom: header.minZoom,
        maxZoom: header.maxZoom,
        bounds: [header.minLon, header.minLat, header.maxLon, header.maxLat],
        center: [header.centerLon, header.centerLat, header.centerZoom]
      };
    },
    async tile(z, x, y) {
      const response = await archive.getZxy(z, x, y);
      return response ? new Uint8Array(response.data) : null;
    }
  };
}

declare global {
  var __rddotMapTiles: MapTileArchive | undefined;
}

/** The configured archive, or null when this deployment has none. */
export function getMapTileArchive(): MapTileArchive | null {
  const file = process.env.MAP_TILES_FILE?.trim();
  const key = process.env.MAP_TILES_OBJECT_KEY?.trim();
  if (!file && !key) return null;
  globalThis.__rddotMapTiles ??= file
    ? createMapTileArchive(new FileRangeSource(resolve(file)), basename(file))
    : createMapTileArchive(new StorageRangeSource(key ?? ""), basename(key ?? ""));
  return globalThis.__rddotMapTiles;
}
