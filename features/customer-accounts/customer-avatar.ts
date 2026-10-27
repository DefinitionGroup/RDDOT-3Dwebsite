import type { CustomerAccountId } from "@/features/projects/project-module";

/**
 * Profile P3: the person's own photo. The browser scales a picture down
 * before sending it; the server decodes it, crops the centre square and
 * stores a WebP without metadata, so a phone's GPS position never lands in
 * storage. Only the owner sees it for now (share links follow in P4).
 */
export const AVATAR_LIMITS = {
  /** The longest edge the browser sends. */
  uploadEdgeMax: 1600,
  /** A request body stays under Vercel's 4.5 MB limit. */
  uploadBytesMax: 4_000_000,
  /** The shortest edge accepted: smaller pictures look blurred in the circle. */
  minEdge: 200,
  /** The stored square, never larger than the picture itself. */
  storedEdge: 512
} as const;

/** What the upload accepts. HEIC from phones reaches it as JPEG through the browser's picker. */
export const AVATAR_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type CustomerAvatar = { id: string; createdAt: Date };

export type SaveAvatarResult =
  | { kind: "saved"; avatar: CustomerAvatar }
  | { kind: "not-an-image" }
  | { kind: "too-small" }
  | { kind: "storage-failed" };

export type CustomerAvatarModule = {
  getAvatar(input: { ownerId: CustomerAccountId }): Promise<CustomerAvatar | null>;
  /** Replaces the photo; the previous file is queued for deletion with its row. */
  saveAvatar(input: { ownerId: CustomerAccountId; bytes: Uint8Array }): Promise<SaveAvatarResult>;
  removeAvatar(input: { ownerId: CustomerAccountId }): Promise<{ kind: "removed" | "none" }>;
  /** A short-lived URL to the stored photo, minted for its owner only. */
  readUrl(input: { ownerId: CustomerAccountId }): Promise<string | null>;
  /** The stored WebP, for the data export. */
  readBytes(input: { ownerId: CustomerAccountId }): Promise<Uint8Array | null>;
};
