import "server-only";

import {
  buildPhotoPrompt,
  findPhotoPreset
} from "@/features/configurator/photo/photo-presets";
import {
  findFinish,
  RDTD_KITCHEN_PRODUCT_V2
} from "@/features/configurator/product-definition";
import { parseConfiguration } from "@/features/projects/configuration-contract";
import { getDatabase } from "@/lib/server/db/database";
import {
  createPostgresPhotoJobModule,
  type PromptBuilder
} from "@/lib/server/db/photo-jobs-postgres";
import { getObjectStorage } from "@/lib/server/object-storage/object-storage";
import {
  createReplicatePhotoGenerationAdapter,
  createUnavailablePhotoGenerationAdapter
} from "@/lib/server/photo-jobs/replicate-adapter";

/**
 * Product facts come from the pinned Configuration Revision, never from client
 * input (ADR 0008, gap G6). Only the Scene Preset is customer-selectable, and
 * only from the approved list.
 */
const buildPrompt: PromptBuilder = ({
  normalizedConfiguration,
  scenePresetKey
}) => {
  const configuration = parseConfiguration(normalizedConfiguration);
  const preset = findPhotoPreset(scenePresetKey);
  const cabinetFinish = findFinish(
    RDTD_KITCHEN_PRODUCT_V2.cabinetColors,
    configuration.cabinetColorKey
  );
  const frontFinish = findFinish(
    RDTD_KITCHEN_PRODUCT_V2.frontColors,
    configuration.frontColorKey
  );
  return buildPhotoPrompt(preset, cabinetFinish, frontFinish);
};

function resolveAdapter() {
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  if (!token) {
    return createUnavailablePhotoGenerationAdapter("provider-not-configured");
  }
  // The module-level kill switch of ADR 0008 (gap G11). Generation is off unless
  // explicitly enabled; status, listing and cancellation keep working either way.
  if (process.env.PHOTO_GENERATION_ENABLED !== "true") {
    return createUnavailablePhotoGenerationAdapter("provider-disabled");
  }
  return createReplicatePhotoGenerationAdapter(token);
}

export function getPhotoJobs() {
  return createPostgresPhotoJobModule(getDatabase(), {
    storage: getObjectStorage(),
    adapter: resolveAdapter(),
    buildPrompt
  });
}
