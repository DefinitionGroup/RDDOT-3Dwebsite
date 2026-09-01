import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import type {
  ObjectStorageModule,
  PresignedDownload,
  PresignedUpload,
  StorageKey,
  StoredObjectFacts
} from "@/features/object-storage/object-storage-module";

const DEFAULT_UPLOAD_TTL_SECONDS = 300;
const DEFAULT_DOWNLOAD_TTL_SECONDS = 300;
const MAX_TTL_SECONDS = 3600;

const ttlSchema = z.number().int().positive().max(MAX_TTL_SECONDS);
const byteSizeSchema = z.number().int().positive();

/**
 * Keys are built by the application from generated identifiers and are never
 * derived from customer input (ADR 0011). This rejects traversal and absolute
 * forms as a second line of defence rather than as the primary one.
 */
const storageKeySchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[A-Za-z0-9][A-Za-z0-9/_.-]*$/, "unexpected characters in storage key")
  .refine((key) => !key.includes(".."), "storage key may not traverse")
  .refine((key) => !key.includes("//"), "storage key may not contain empty segments");

export type S3ObjectStorageConfiguration = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export function createS3ObjectStorage(
  configuration: S3ObjectStorageConfiguration,
  clock: () => Date = () => new Date()
): ObjectStorageModule {
  const client = new S3Client({
    endpoint: configuration.endpoint,
    // Not a location. SigV4 requires a region in the credential scope, and the
    // value only has to match what the server is configured with. See ADR 0011.
    region: configuration.region,
    forcePathStyle: configuration.forcePathStyle,
    credentials: {
      accessKeyId: configuration.accessKeyId,
      secretAccessKey: configuration.secretAccessKey
    },
    // Recent SDK versions add CRC checksum headers to every request by default,
    // which S3-compatible servers outside AWS commonly reject. Only send them
    // when the operation actually requires them.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED"
  });

  function expiryFrom(seconds: number) {
    return new Date(clock().getTime() + seconds * 1000);
  }

  return {
    async presignUpload(input): Promise<PresignedUpload> {
      const key = storageKeySchema.parse(input.key);
      const byteSize = byteSizeSchema.parse(input.byteSize);
      const expiresIn = ttlSchema.parse(
        input.expiresInSeconds ?? DEFAULT_UPLOAD_TTL_SECONDS
      );

      const url = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: configuration.bucket,
          Key: key,
          ContentType: input.contentType,
          // Signed, so the upload is bound to exactly this length. An upload of
          // any other size fails at storage rather than reaching validation.
          ContentLength: byteSize
        }),
        { expiresIn, signableHeaders: new Set(["content-length", "content-type"]) }
      );

      return {
        key,
        url,
        method: "PUT",
        requiredHeaders: {
          "content-type": input.contentType,
          "content-length": String(byteSize)
        },
        expiresAt: expiryFrom(expiresIn)
      };
    },

    async presignDownload(input): Promise<PresignedDownload> {
      const key = storageKeySchema.parse(input.key);
      const expiresIn = ttlSchema.parse(
        input.expiresInSeconds ?? DEFAULT_DOWNLOAD_TTL_SECONDS
      );

      const url = await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: configuration.bucket,
          Key: key,
          ResponseContentDisposition: input.downloadFilename
            ? `attachment; filename="${sanitizeFilename(input.downloadFilename)}"`
            : undefined
        }),
        { expiresIn }
      );

      return { key, url, expiresAt: expiryFrom(expiresIn) };
    },

    async statObject(key: StorageKey): Promise<StoredObjectFacts | null> {
      const parsedKey = storageKeySchema.parse(key);

      try {
        const response = await client.send(
          new HeadObjectCommand({ Bucket: configuration.bucket, Key: parsedKey })
        );

        return {
          key: parsedKey,
          byteSize: Number(response.ContentLength ?? 0),
          contentType: response.ContentType ?? "application/octet-stream"
        };
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    async deleteObject(key: StorageKey): Promise<void> {
      const parsedKey = storageKeySchema.parse(key);

      try {
        await client.send(
          new DeleteObjectCommand({ Bucket: configuration.bucket, Key: parsedKey })
        );
      } catch (error) {
        // Deletion is idempotent: an object that is already gone is the state
        // the caller asked for.
        if (isNotFound(error)) return;
        throw error;
      }
    }
  };
}

function isNotFound(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String((error as { name: unknown }).name) : "";
  const status =
    "$metadata" in error
      ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode
      : undefined;
  return name === "NotFound" || name === "NoSuchKey" || status === 404;
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
}
