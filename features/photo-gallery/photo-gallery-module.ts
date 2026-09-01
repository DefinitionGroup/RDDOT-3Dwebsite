import type {
  ConfigurationRevisionId,
  CustomerAccountId,
  ProjectId
} from "@/features/projects/project-module";

export type GeneratedPhotoId = string;

/**
 * A Generated Photo as the owner sees it. `displayUrl` is a short-lived
 * presigned read minted for this request only — never a bucket URL, never
 * durable, and never usable by anyone the application has not authorized
 * (ADR 0011). Clients must treat it as expiring and refetch the page rather
 * than persisting it.
 */
export type GalleryPhoto = {
  id: GeneratedPhotoId;
  projectId: ProjectId;
  /** The profile gallery spans Projects, so a photo must say which kitchen it is. */
  projectName: string;
  revisionId: ConfigurationRevisionId;
  revisionLabel: string | null;
  width: number;
  height: number;
  byteSize: number;
  contentType: string;
  createdAt: Date;
  displayUrl: string;
  displayUrlExpiresAt: Date;
};

export type GalleryCursor = {
  createdAt: Date;
  id: GeneratedPhotoId;
};

export type GalleryPage = {
  items: GalleryPhoto[];
  totalCount: number;
  nextCursor: GalleryCursor | null;
};

export type PhotoDownload = {
  url: string;
  expiresAt: Date;
  filename: string;
};

export type DeleteGeneratedPhotoResult =
  | { kind: "deleted" }
  | { kind: "unavailable" };

export type PhotoGalleryModule = {
  /** Gallery for one Project. Owner-scoped; a trashed Project exposes nothing. */
  listForProject(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
    limit?: number;
    cursor?: GalleryCursor | null;
  }): Promise<GalleryPage>;

  /**
   * Account-wide gallery for the profile. Same authorization path as the
   * per-Project gallery, deliberately: one owner predicate, not two.
   */
  listForAccount(input: {
    ownerId: CustomerAccountId;
    limit?: number;
    cursor?: GalleryCursor | null;
  }): Promise<GalleryPage>;

  /** A download grant with an attachment disposition. Null when not the owner's. */
  getDownload(input: {
    ownerId: CustomerAccountId;
    photoId: GeneratedPhotoId;
  }): Promise<PhotoDownload | null>;

  /**
   * Removes the photo. The stored object is not deleted inline: removing the
   * row records a deletion intent that the storage sweep carries out, so the
   * object cannot outlive the row even if this process dies (ADR 0011).
   */
  deletePhoto(input: {
    ownerId: CustomerAccountId;
    photoId: GeneratedPhotoId;
  }): Promise<DeleteGeneratedPhotoResult>;
};
