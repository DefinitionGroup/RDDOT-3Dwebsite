import "server-only";

import type { ObjectStorageModule } from "@/features/object-storage/object-storage-module";
import {
  createS3ObjectStorage,
  type S3ObjectStorageConfiguration
} from "@/lib/server/object-storage/s3-object-storage";

declare global {
  var __rddotObjectStorage: ObjectStorageModule | undefined;
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for object storage`);
  return value;
}

export function readObjectStorageConfiguration(): S3ObjectStorageConfiguration {
  return {
    endpoint: requiredEnvironment("OBJECT_STORAGE_ENDPOINT"),
    // SigV4 signing scope only — it must match the server's configured region,
    // and it says nothing about where data physically lives. See ADR 0011.
    region: requiredEnvironment("OBJECT_STORAGE_REGION"),
    bucket: requiredEnvironment("OBJECT_STORAGE_BUCKET"),
    accessKeyId: requiredEnvironment("OBJECT_STORAGE_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnvironment("OBJECT_STORAGE_SECRET_ACCESS_KEY"),
    forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE !== "false"
  };
}

/**
 * Resolved lazily so that a deployment without storage configured fails when
 * storage is first used, not at module load of every route that imports a
 * neighbour. Matches the fail-closed posture of the email provider (ADR 0010).
 */
export function getObjectStorage(): ObjectStorageModule {
  globalThis.__rddotObjectStorage ??= createS3ObjectStorage(
    readObjectStorageConfiguration()
  );
  return globalThis.__rddotObjectStorage;
}
