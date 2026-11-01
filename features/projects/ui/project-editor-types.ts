import type { SerializedGalleryPage } from "@/features/photo-gallery/serialize-gallery";
import type { RevisionDisplaySnapshot } from "@/features/projects/revision-display";

export type EditableProjectRevision = {
  id: string;
  label: string | null;
  trigger: "version-save" | "share" | "photo" | "quote";
  displaySnapshot: RevisionDisplaySnapshot | null;
  createdAt: string;
};

export type EditableSharedRevisionLink = {
  id: string;
  revisionId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type EditableProject = {
  /** A Dealer User edits through the Dealer Grant: no rename, photos or copies (ADR 0014). */
  access: "owner" | "dealer";
  id: string;
  name: string;
  updatedAt: string;
  version: number;
  revisions: EditableProjectRevision[];
  revisionTotalCount: number;
  revisionNextCursor: { createdAt: string; id: string } | null;
  shareLinks: EditableSharedRevisionLink[];
  gallery: SerializedGalleryPage;
};
