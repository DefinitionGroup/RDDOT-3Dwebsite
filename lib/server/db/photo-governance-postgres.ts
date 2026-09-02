import "server-only";

import type { Kysely } from "kysely";
import { z } from "zod";
import {
  type ActivePhotoReleases,
  type PhotoGovernance,
  scenePresetSchema
} from "@/features/photo-jobs/photo-governance";
import type { Database } from "@/lib/server/db/database-types";

const scenePresetsSchema = z.array(scenePresetSchema).min(1);

/**
 * Reads the active releases. There is at most one active row per table (a
 * partial unique index enforces it); activating a new version is a deliberate
 * data change, never something the application does on its own.
 */
export function createPostgresPhotoGovernance(database: Kysely<Database>): PhotoGovernance {
  return {
    async getActiveReleases(): Promise<ActivePhotoReleases | null> {
      const [template, model] = await Promise.all([
        database
          .withSchema("app")
          .selectFrom("promptTemplateRelease")
          .selectAll()
          .where("active", "=", true)
          .executeTakeFirst(),
        database
          .withSchema("app")
          .selectFrom("modelRelease")
          .selectAll()
          .where("active", "=", true)
          .executeTakeFirst()
      ]);
      if (!template || !model) return null;

      const scenePresets = scenePresetsSchema.safeParse(template.scenePresets);
      if (!scenePresets.success) {
        console.error("Active Prompt Template Release carries invalid Scene Presets", {
          releaseId: template.id
        });
        return null;
      }

      return {
        promptTemplate: {
          id: template.id,
          key: template.key,
          version: template.version,
          template: template.template,
          scenePresets: scenePresets.data,
          approvedBy: template.approvedBy,
          approvedAt: new Date(template.approvedAt)
        },
        model: {
          id: model.id,
          provider: model.provider,
          modelIdentifier: model.modelIdentifier,
          versionLabel: model.versionLabel,
          estimatedCostCents: model.estimatedCostCents,
          approvedBy: model.approvedBy,
          approvedAt: new Date(model.approvedAt)
        }
      };
    }
  };
}
