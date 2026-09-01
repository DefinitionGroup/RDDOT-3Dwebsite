/**
 * The storage boundary. Application Modules see object keys and presigned URLs
 * and nothing else — no S3 client types, bucket names, endpoints, or provider
 * URLs cross this Interface (ADR 0011).
 */

export type StorageKey = string;

export type StoredObjectContentType =
  | "image/jpeg"
  | "image/png"
  | "image/webp";

/**
 * A single-use upload grant. The byte size is exact rather than a ceiling: it
 * is part of the signature, so an upload of any other length is rejected by
 * storage before the application ever sees it.
 */
export type PresignedUpload = {
  key: StorageKey;
  url: string;
  method: "PUT";
  requiredHeaders: Record<string, string>;
  expiresAt: Date;
};

export type PresignedDownload = {
  key: StorageKey;
  url: string;
  expiresAt: Date;
};

export type StoredObjectFacts = {
  key: StorageKey;
  byteSize: number;
  contentType: string;
};

export type ObjectStorageModule = {
  /**
   * Grants a browser the right to upload exactly one object of exactly this
   * type and length. Never called before the caller has authorized the actor.
   */
  presignUpload(input: {
    key: StorageKey;
    contentType: StoredObjectContentType;
    byteSize: number;
    expiresInSeconds?: number;
  }): Promise<PresignedUpload>;

  /**
   * Grants a short-lived read. The bucket is private; this is the only way an
   * object is ever read by a browser, and it is minted only after an ownership
   * check. `downloadFilename` sets a download disposition for gallery exports.
   */
  presignDownload(input: {
    key: StorageKey;
    expiresInSeconds?: number;
    downloadFilename?: string;
  }): Promise<PresignedDownload>;

  /**
   * Server-side confirmation of what actually landed. An upload is not trusted
   * on the browser's word; the caller compares these facts against what it
   * granted. Returns null when the object is absent.
   */
  statObject(key: StorageKey): Promise<StoredObjectFacts | null>;

  /** Idempotent. A missing object is success, not an error. */
  deleteObject(key: StorageKey): Promise<void>;
};
