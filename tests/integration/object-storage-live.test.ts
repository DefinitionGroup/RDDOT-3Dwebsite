import { existsSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { createS3ObjectStorage } from "@/lib/server/object-storage/s3-object-storage";

if (!process.env.OBJECT_STORAGE_ENDPOINT && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const configured =
  process.env.OBJECT_STORAGE_ENDPOINT &&
  process.env.OBJECT_STORAGE_REGION &&
  process.env.OBJECT_STORAGE_BUCKET &&
  process.env.OBJECT_STORAGE_ACCESS_KEY_ID &&
  process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY;

/**
 * Exercises the real deployment rather than a mock: signing, path-style
 * addressing, checksum-header compatibility, and the presigned round-trip are
 * all things that only fail against a real server. Skipped when storage is not
 * configured, so the suite still runs on a bare checkout.
 */
describe.skipIf(!configured)("object storage round-trip (live)", () => {
  const storage = createS3ObjectStorage({
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT!,
    region: process.env.OBJECT_STORAGE_REGION!,
    bucket: process.env.OBJECT_STORAGE_BUCKET!,
    accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY!,
    forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE !== "false"
  });

  // A one-pixel JPEG: real bytes with a real content type, small enough to be
  // free and large enough to prove the signed length is honoured.
  const body = Buffer.from(
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a" +
      "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA" +
      "AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
    "base64"
  );

  const key = `smoke/${crypto.randomUUID()}.jpg`;
  let uploaded = false;

  afterAll(async () => {
    if (uploaded) await storage.deleteObject(key).catch(() => {});
  });

  it("completes presign, upload, stat, download, and delete", async () => {
    const upload = await storage.presignUpload({
      key,
      contentType: "image/jpeg",
      byteSize: body.byteLength
    });

    expect(upload.url).toContain("X-Amz-Signature");

    const put = await fetch(upload.url, {
      method: "PUT",
      headers: upload.requiredHeaders,
      body: new Uint8Array(body)
    });
    expect(
      put.ok,
      `upload failed ${put.status}: ${await put.text().catch(() => "")}`
    ).toBe(true);
    uploaded = true;

    const facts = await storage.statObject(key);
    expect(facts).not.toBeNull();
    expect(facts!.byteSize).toBe(body.byteLength);
    expect(facts!.contentType).toBe("image/jpeg");

    const download = await storage.presignDownload({ key });
    const get = await fetch(download.url);
    expect(get.ok, `download failed ${get.status}`).toBe(true);
    expect(Buffer.from(await get.arrayBuffer()).byteLength).toBe(body.byteLength);

    await storage.deleteObject(key);
    uploaded = false;
    expect(await storage.statObject(key)).toBeNull();
  }, 60_000);

  it("treats deleting an absent object as success", async () => {
    await expect(
      storage.deleteObject(`smoke/${crypto.randomUUID()}.jpg`)
    ).resolves.toBeUndefined();
  }, 30_000);

  it("rejects an upload whose length differs from the signed length", async () => {
    const shortKey = `smoke/${crypto.randomUUID()}.jpg`;
    const upload = await storage.presignUpload({
      key: shortKey,
      contentType: "image/jpeg",
      byteSize: body.byteLength
    });

    const response = await fetch(upload.url, {
      method: "PUT",
      headers: { ...upload.requiredHeaders, "content-length": String(body.byteLength - 1) },
      body: new Uint8Array(body.subarray(0, body.byteLength - 1))
    });

    expect(response.ok).toBe(false);
    await storage.deleteObject(shortKey).catch(() => {});
  }, 30_000);
});
