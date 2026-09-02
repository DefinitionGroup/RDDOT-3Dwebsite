import "server-only";

import {
  findConfiguratorProductDefinition,
  findFinish
} from "@/features/configurator/product-definition";
import { parseConfiguration } from "@/features/projects/configuration-contract";
import { getDatabase } from "@/lib/server/db/database";
import { createPostgresPhotoGovernance } from "@/lib/server/db/photo-governance-postgres";
import {
  createPostgresPhotoJobModule,
  DEFAULT_PHOTO_LIMITS,
  type PhotoLimits,
  type PromptFactsBuilder
} from "@/lib/server/db/photo-jobs-postgres";
import { getObjectStorage } from "@/lib/server/object-storage/object-storage";
import {
  createReplicatePhotoGenerationAdapter,
  createUnavailablePhotoGenerationAdapter
} from "@/lib/server/photo-jobs/replicate-adapter";

/**
 * Product facts for the Prompt Template Release come from the pinned
 * Configuration Revision under the Product Definition version it was saved
 * with — never from client input, never from today's definition (ADR 0008,
 * gap G6). An unsupported version yields no facts and the job fails closed.
 */
const buildPromptFacts: PromptFactsBuilder = ({
  normalizedConfiguration,
  productDefinitionVersion
}) => {
  const definition = findConfiguratorProductDefinition(productDefinitionVersion);
  if (!definition) return null;
  let configuration;
  try {
    configuration = parseConfiguration(normalizedConfiguration);
  } catch {
    return null;
  }
  if (configuration.schemaVersion !== definition.schemaVersion) return null;

  const cabinetFinish = findFinish(definition.cabinetColors, configuration.cabinetColorKey);
  const frontFinish = findFinish(definition.frontColors, configuration.frontColorKey);
  return {
    frontLabel: frontFinish.label.en,
    frontMaterial: frontFinish.material,
    cabinetLabel: cabinetFinish.label.en
  };
};

export function getPhotoGenerationAdapter() {
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  if (!token) {
    return createUnavailablePhotoGenerationAdapter("provider-not-configured");
  }
  // The module-level kill switch of ADR 0008 (gap G11). Generation is off unless
  // explicitly enabled; status, listing and cancellation keep working either way.
  if (process.env.PHOTO_GENERATION_ENABLED !== "true") {
    return createUnavailablePhotoGenerationAdapter("provider-disabled");
  }
  return createReplicatePhotoGenerationAdapter(token, {
    webhookSecret: process.env.REPLICATE_WEBHOOK_SIGNING_SECRET ?? null
  });
}

/**
 * Where the provider delivers events. Unset in local development, where the
 * application is not reachable from outside; jobs then complete through
 * reconciliation on read and by the sweep.
 */
function resolveWebhookUrl() {
  const url = process.env.PHOTO_WEBHOOK_URL?.trim();
  return url && url.startsWith("https://") ? url : null;
}

/** Ceilings of gap G7, overridable per environment; defaults are conservative. */
function resolveLimits(): PhotoLimits {
  function read(name: string, fallback: number) {
    const value = Number(process.env[name]);
    return Number.isInteger(value) && value >= 0 ? value : fallback;
  }
  return {
    customerDailyJobs: read("PHOTO_CUSTOMER_DAILY_JOBS", DEFAULT_PHOTO_LIMITS.customerDailyJobs),
    providerDailyJobs: read("PHOTO_DAILY_BUDGET_JOBS", DEFAULT_PHOTO_LIMITS.providerDailyJobs),
    providerDailyCents: read("PHOTO_DAILY_BUDGET_CENTS", DEFAULT_PHOTO_LIMITS.providerDailyCents)
  };
}

export function getPhotoJobs() {
  const database = getDatabase();
  return createPostgresPhotoJobModule(database, {
    storage: getObjectStorage(),
    adapter: getPhotoGenerationAdapter(),
    governance: createPostgresPhotoGovernance(database),
    buildPromptFacts,
    webhookUrl: resolveWebhookUrl(),
    limits: resolveLimits()
  });
}
