import "server-only";

import type { Kysely } from "kysely";
import { z } from "zod";
import type { CustomerProfile } from "@/features/customer-accounts/customer-profile";
import type { Database } from "@/lib/server/db/database-types";

const uuidSchema = z.uuid();

const iso = (value: Date | string | null) => (value ? new Date(value).toISOString() : null);

/**
 * Everything the application keeps about one Customer Account, as one JSON
 * document for "Meine Daten herunterladen" (account management A4). Internal
 * keys stay out: no storage paths, token hashes or idempotency keys. Photos are
 * listed, not embedded; the account downloads them one by one.
 */
export async function exportCustomerAccount(
  database: Kysely<Database>,
  input: {
    ownerId: string;
    email: string;
    profile: CustomerProfile;
    /** The profile photo as a `data:` URL, so the file needs no link that expires. */
    photo?: string | null;
    exportedAt?: Date;
  }
) {
  const ownerId = uuidSchema.parse(input.ownerId);
  const app = database.withSchema("app");

  const account = await app
    .selectFrom("customerAccount")
    .select(["id", "createdAt"])
    .where("id", "=", ownerId)
    .executeTakeFirstOrThrow();

  const projects = await app
    .selectFrom("project")
    .innerJoin("workingConfiguration", "workingConfiguration.projectId", "project.id")
    .select([
      "project.id",
      "project.name",
      "project.lifecycle",
      "project.privateNotes",
      "project.createdAt",
      "project.updatedAt",
      "project.trashedAt",
      "workingConfiguration.normalizedConfiguration",
      "workingConfiguration.productDefinitionVersion",
      "workingConfiguration.version",
      "workingConfiguration.updatedAt as configurationUpdatedAt"
    ])
    .where("project.ownerId", "=", ownerId)
    .orderBy("project.createdAt")
    .execute();
  const projectIds = projects.map((project) => project.id);
  const ofProjects = projectIds.length > 0 ? projectIds : ["00000000-0000-0000-0000-000000000000"];

  const [revisions, links, requests, jobs, photos] = await Promise.all([
    app
      .selectFrom("configurationRevision")
      .select(["id", "projectId", "label", "trigger", "productDefinitionVersion", "normalizedConfiguration", "displaySnapshot", "createdAt"])
      .where("projectId", "in", ofProjects)
      .orderBy("createdAt")
      .execute(),
    app
      .selectFrom("sharedRevisionLink")
      .select(["id", "projectId", "configurationRevisionId", "createdAt", "expiresAt", "revokedAt"])
      .where("projectId", "in", ofProjects)
      .orderBy("createdAt")
      .execute(),
    app
      .selectFrom("quoteRequest")
      .select([
        "reference",
        "projectId",
        "configurationRevisionId",
        "state",
        "contactName",
        "contactEmail",
        "contactPhone",
        "contactSalutation",
        "contactTitle",
        "contactPostalCode",
        "contactChannel",
        "contactTime",
        "customerType",
        "company",
        "professionalRole",
        "projectKind",
        "timeframe",
        "budgetBand",
        "wallLengthCm",
        "note",
        "consentVersion",
        "consentAcceptedAt",
        "priceIndication",
        "createdAt"
      ])
      .where("projectId", "in", ofProjects)
      .orderBy("createdAt")
      .execute(),
    app
      .selectFrom("photoJob")
      .select(["id", "projectId", "configurationRevisionId", "scenePresetKey", "state", "createdAt", "terminalAt"])
      .where("projectId", "in", ofProjects)
      .orderBy("createdAt")
      .execute(),
    app
      .selectFrom("generatedPhoto")
      .select(["id", "projectId", "photoJobId", "contentType", "width", "height", "byteSize", "createdAt"])
      .where("projectId", "in", ofProjects)
      .orderBy("createdAt")
      .execute()
  ]);

  return {
    format: "rotpunkt-signature-account-export@1",
    exportedAt: (input.exportedAt ?? new Date()).toISOString(),
    account: { id: account.id, email: input.email, createdAt: iso(account.createdAt) },
    profile: { ...input.profile, photo: input.photo ?? null },
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      lifecycle: project.lifecycle,
      privateNotes: project.privateNotes,
      createdAt: iso(project.createdAt),
      updatedAt: iso(project.updatedAt),
      trashedAt: iso(project.trashedAt),
      workingConfiguration: {
        configuration: project.normalizedConfiguration,
        productDefinitionVersion: project.productDefinitionVersion,
        version: Number(project.version),
        updatedAt: iso(project.configurationUpdatedAt)
      },
      versions: revisions
        .filter((revision) => revision.projectId === project.id)
        .map((revision) => ({
          id: revision.id,
          label: revision.label,
          trigger: revision.trigger,
          productDefinitionVersion: revision.productDefinitionVersion,
          configuration: revision.normalizedConfiguration,
          display: revision.displaySnapshot,
          createdAt: iso(revision.createdAt)
        })),
      shareLinks: links
        .filter((link) => link.projectId === project.id)
        .map((link) => ({
          id: link.id,
          versionId: link.configurationRevisionId,
          createdAt: iso(link.createdAt),
          expiresAt: iso(link.expiresAt),
          revokedAt: iso(link.revokedAt)
        })),
      quoteRequests: requests
        .filter((request) => request.projectId === project.id)
        .map((request) => ({
          reference: request.reference,
          versionId: request.configurationRevisionId,
          state: request.state,
          contact: {
            name: request.contactName,
            email: request.contactEmail,
            phone: request.contactPhone,
            postalCode: request.contactPostalCode,
            salutation: request.contactSalutation,
            title: request.contactTitle,
            contactChannel: request.contactChannel,
            contactTime: request.contactTime,
            customerType: request.customerType,
            company: request.company,
            professionalRole: request.professionalRole
          },
          planning: {
            projectKind: request.projectKind,
            timeframe: request.timeframe,
            budgetBand: request.budgetBand,
            wallLengthCm: request.wallLengthCm
          },
          note: request.note,
          consent: { version: request.consentVersion, acceptedAt: iso(request.consentAcceptedAt) },
          priceIndication: request.priceIndication,
          createdAt: iso(request.createdAt)
        })),
      photoJobs: jobs
        .filter((job) => job.projectId === project.id)
        .map((job) => ({
          id: job.id,
          versionId: job.configurationRevisionId,
          scene: job.scenePresetKey,
          state: job.state,
          createdAt: iso(job.createdAt),
          finishedAt: iso(job.terminalAt)
        })),
      photos: photos
        .filter((photo) => photo.projectId === project.id)
        .map((photo) => ({
          id: photo.id,
          photoJobId: photo.photoJobId,
          contentType: photo.contentType,
          width: photo.width,
          height: photo.height,
          byteSize: photo.byteSize,
          createdAt: iso(photo.createdAt)
        }))
    }))
  };
}
