import { existsSync, readdirSync } from "node:fs";
import { open, type FileHandle } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createMapTileArchive,
  FileRangeSource,
  StorageRangeSource
} from "@/lib/server/map/map-tiles";

// Runs against the local Germany archive when it is there (`.data/map/`, not in
// git); CI has none and skips. See .scratch/dealer-access/spec.md, Map.
const archiveDirectory = ".data/map";
const archivePath = existsSync(archiveDirectory)
  ? readdirSync(archiveDirectory)
      .filter((name) => name.endsWith(".pmtiles"))
      .map((name) => `${archiveDirectory}/${name}`)[0]
  : undefined;

/** The tile at zoom `z` holding a point, in the XYZ scheme. */
function tileOf(z: number, latitude: number, longitude: number) {
  const scale = 2 ** z;
  const radians = (latitude * Math.PI) / 180;
  return {
    x: Math.floor(((longitude + 180) / 360) * scale),
    y: Math.floor(((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * scale)
  };
}

describe.skipIf(!archivePath)("map tile archive", () => {
  let server: Server;
  let file: FileHandle;
  let url: string;

  beforeAll(async () => {
    // A range-serving stand-in for the bucket's presigned URL.
    file = await open(archivePath ?? "", "r");
    const size = (await file.stat()).size;
    server = createServer(async (request, response) => {
      const [start, end] = (request.headers.range ?? "")
        .replace("bytes=", "")
        .split("-")
        .map(Number);
      const length = Math.min(end, size - 1) - start + 1;
      const bytes = new Uint8Array(length);
      await file.read(bytes, 0, length, start);
      response.writeHead(206, {
        "content-length": String(length),
        "content-range": `bytes ${start}-${start + length - 1}/${size}`
      });
      response.end(bytes);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/archive.pmtiles`;
  });

  afterAll(async () => {
    server?.close();
    await file?.close();
  });

  it("describes the archive and reads a tile over Berlin from the local file", async () => {
    const archive = createMapTileArchive(new FileRangeSource(archivePath ?? ""), "local");
    const info = await archive.info();
    expect(info.maxZoom).toBeGreaterThanOrEqual(8);
    expect(info.bounds[0]).toBeLessThan(6);
    expect(info.bounds[2]).toBeGreaterThan(15);

    const { x, y } = tileOf(8, 52.52, 13.39);
    const tile = await archive.tile(8, x, y);
    expect(tile?.byteLength).toBeGreaterThan(1000);
    expect(await archive.tile(info.maxZoom + 1, 0, 0)).toBeNull();
  });

  it("reads the same tile through a presigned URL and renews it before it expires", async () => {
    let presigned = 0;
    const source = new StorageRangeSource("map/germany.pmtiles", async () => {
      presigned += 1;
      // Expires within the minute of slack, so every read asks again.
      return { url, expiresAt: new Date(Date.now() + 30_000) };
    });
    const fromStorage = createMapTileArchive(source, "storage");
    const fromFile = createMapTileArchive(new FileRangeSource(archivePath ?? ""), "local");
    const { x, y } = tileOf(7, 48.14, 11.58);

    expect(await fromStorage.tile(7, x, y)).toEqual(await fromFile.tile(7, x, y));
    expect(presigned).toBeGreaterThan(1);
    expect(source.getKey()).toBe("storage:map/germany.pmtiles");
  });
});
