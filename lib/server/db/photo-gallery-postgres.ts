import "server-only";

import type { Kysely } from "kysely";
import { z } from "zod";
import type { ObjectStorageModule } from "@/features/object-storage/object-storage-module";
import type {
  DeleteGeneratedPhotoResult,
  GalleryPage,
  GalleryPhoto,
  PhotoDownload,
  PhotoGalleryModule
} from "@/features/photo-gallery/photo-gallery-module";
import type { Database } from "@/lib/server/db/database-types";

const uuidSchema = z.uuid();
const limitSchema = z.number().int().min(1).max(100);

/**
 * Long enough for a gallery page to stay usable while the visitor scrolls and
 * looks, short enough that a leaked URL is not a durable grant. Clients refetch
 * rather than caching these.
 */
const DISPLAY_TTL_SECONDS = 900;
const DOWNLOAD_TTL_SECONDS = 300;

type PhotoRow = {
  id: string;
  projectId: string;
  projectName: string;
  configurationRevisionId: string;
  revisionLabel: string | null;
  storageKey: string;
  contentType: string;
  byteSize: number;
  width: number;
  height: number;
  createdAt: Date;
};

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

function downloadFilename(row: Pick<PhotoRow, "projectName" | "createdAt" | "contentType">) {
  const stamp = new Date(row.createdAt).toISOString().slice(0, 10);
  const extension = EXTENSION_BY_CONTENT_TYPE[row.contentType] ?? "img";
  return `${row.projectName}-${stamp}.${extension}`;
}

export function createPostgresPhotoGalleryModule(
  database: Kysely<Database>,
  storage: ObjectStorageModule
): PhotoGalleryModule {
  /**
   * Every read starts here. The join to `project` carries the owner predicate,
   * so there is exactly one authorization path for both galleries — a photo
   * that is not the caller's simply does not appear in the result set.
   */
  function ownedPhotos(ownerId: string) {
    return database
      .withSchema("app")
      .selectFrom("generatedPhoto")
      .innerJoin("project", "project.id", "generatedPhoto.projectId")
      .innerJoin(
        "configurationRevision",
        "configurationRevision.id",
        "generatedPhoto.configurationRevisionId"
      )
      .where("project.ownerId", "=", ownerId)
      .where("project.lifecycle", "!=", "trashed");
  }

  async function toGalleryPhoto(row: PhotoRow): Promise<GalleryPhoto> {
    const download = await storage.presignDownload({
      key: row.storageKey,
      expiresInSeconds: DISPLAY_TTL_SECONDS
    });

    return {
      id: row.id,
      projectId: row.projectId,
      projectName: row.projectName,
      revisionId: row.configurationRevisionId,
      revisionLabel: row.revisionLabel,
      width: row.width,
      height: row.height,
      byteSize: row.byteSize,
      contentType: row.contentType,
      createdAt: new Date(row.createdAt),
      displayUrl: download.url,
      displayUrlExpiresAt: download.expiresAt
    };
  }

  async function page(input: {
    ownerId: string;
    projectId?: string;
    limit?: number;
    cursor?: { createdAt: Date; id: string } | null;
  }): Promise<GalleryPage> {
    const ownerId = uuidSchema.parse(input.ownerId);
    const projectId = input.projectId ? uuidSchema.parse(input.projectId) : null;
    const limit = limitSchema.parse(input.limit ?? 30);
    const cursor = input.cursor
      ? {
          createdAt: z.date().parse(input.cursor.createdAt),
          id: uuidSchema.parse(input.cursor.id)
        }
      : null;

    let query = ownedPhotos(ownerId).select([
      "generatedPhoto.id",
      "generatedPhoto.projectId",
      "project.name as projectName",
      "generatedPhoto.configurationRevisionId",
      "configurationRevision.label as revisionLabel",
      "generatedPhoto.storageKey",
      "generatedPhoto.contentType",
      "generatedPhoto.byteSize",
      "generatedPhoto.width",
      "generatedPhoto.height",
      "generatedPhoto.createdAt"
    ]);

    if (projectId) {
      query = query.where("generatedPhoto.projectId", "=", projectId);
    }

    if (cursor) {
      query = query.where((expression) =>
        expression.or([
          expression("generatedPhoto.createdAt", "<", cursor.createdAt),
          expression.and([
            expression("generatedPhoto.createdAt", "=", cursor.createdAt),
            expression("generatedPhoto.id", "<", cursor.id)
          ])
        ])
      );
    }

    let countQuery = ownedPhotos(ownerId).select((expression) =>
      expression.fn.countAll<number>().as("count")
    );
    if (projectId) {
      countQuery = countQuery.where("generatedPhoto.projectId", "=", projectId);
    }

    const [rows, countRow] = await Promise.all([
      query
        .orderBy("generatedPhoto.createdAt", "desc")
        .orderBy("generatedPhoto.id", "desc")
        .limit(limit + 1)
        .execute(),
      countQuery.executeTakeFirstOrThrow()
    ]);

    const visibleRows = rows.slice(0, limit);
    const last = rows.length > limit ? visibleRows.at(-1) : null;

    return {
      items: await Promise.all(
        visibleRows.map((row) => toGalleryPhoto(row as PhotoRow))
      ),
      totalCount: Number(countRow.count),
      nextCursor: last
        ? { createdAt: new Date(last.createdAt), id: last.id }
        : null
    };
  }

  return {
    async listForProject(input) {
      return page({
        ownerId: input.ownerId,
        projectId: input.projectId,
        limit: input.limit,
        cursor: input.cursor
      });
    },

    async listForAccount(input) {
      return page({
        ownerId: input.ownerId,
        limit: input.limit,
        cursor: input.cursor
      });
    },

    async getDownload(input): Promise<PhotoDownload | null> {
      const ownerId = uuidSchema.parse(input.ownerId);
      const photoId = uuidSchema.parse(input.photoId);

      const row = await ownedPhotos(ownerId)
        .select([
          "generatedPhoto.storageKey",
          "generatedPhoto.contentType",
          "generatedPhoto.createdAt",
          "project.name as projectName"
        ])
        .where("generatedPhoto.id", "=", photoId)
        .executeTakeFirst();

      if (!row) return null;

      const filename = downloadFilename(row as PhotoRow);
      const download = await storage.presignDownload({
        key: row.storageKey,
        expiresInSeconds: DOWNLOAD_TTL_SECONDS,
        downloadFilename: filename
      });

      return { url: download.url, expiresAt: download.expiresAt, filename };
    },

    async deletePhoto(input): Promise<DeleteGeneratedPhotoResult> {
      const ownerId = uuidSchema.parse(input.ownerId);
      const photoId = uuidSchema.parse(input.photoId);

      // Scoped by a correlated owner predicate so a non-owner's delete removes
      // nothing rather than reporting success. The row's disappearance is what
      // enqueues the object deletion, via the database trigger.
      const result = await database
        .withSchema("app")
        .deleteFrom("generatedPhoto")
        .where("id", "=", photoId)
        .where((expression) =>
          expression.exists(
            expression
              .selectFrom("project")
              .select("project.id")
              .whereRef("project.id", "=", "generatedPhoto.projectId")
              .where("project.ownerId", "=", ownerId)
          )
        )
        .executeTakeFirst();

      return Number(result.numDeletedRows ?? 0) > 0
        ? { kind: "deleted" }
        : { kind: "unavailable" };
    }
  };
}
