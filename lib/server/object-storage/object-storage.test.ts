import { afterEach, describe, expect, it, vi } from "vitest";
import { getObjectStorage } from "@/lib/server/object-storage/object-storage";

describe("getObjectStorage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.__rddotObjectStorage = undefined;
  });

  it("reads its configuration when storage is used, not when it is handed out", async () => {
    vi.stubEnv("OBJECT_STORAGE_ENDPOINT", "");
    const storage = getObjectStorage();

    await expect(storage.presignDownload({ key: "avatars/a.webp" })).rejects.toThrow(
      "OBJECT_STORAGE_ENDPOINT is required for object storage"
    );
    // A rejection, not a throw, so a caller's .catch still sees it.
    await expect(storage.deleteObject("avatars/a.webp").catch(() => "caught")).resolves.toBe("caught");
  });

  it("presigns once configured", async () => {
    vi.stubEnv("OBJECT_STORAGE_ENDPOINT", "http://127.0.0.1:9");
    vi.stubEnv("OBJECT_STORAGE_REGION", "test");
    vi.stubEnv("OBJECT_STORAGE_BUCKET", "photos");
    vi.stubEnv("OBJECT_STORAGE_ACCESS_KEY_ID", "test-key");
    vi.stubEnv("OBJECT_STORAGE_SECRET_ACCESS_KEY", "test-secret");

    const download = await getObjectStorage().presignDownload({ key: "avatars/a.webp" });
    expect(new URL(download.url).pathname).toBe("/photos/avatars/a.webp");
  });
});
