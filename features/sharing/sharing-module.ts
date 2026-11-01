import type { AnyConfiguratorState } from "@/features/configurator/types";
import type {
  ConfigurationRevisionId,
  JsonValue,
  ProjectActor,
  ProjectId
} from "@/features/projects/project-module";

export type SharedRevisionLinkId = string;

export type SharedRevisionLinkSummary = {
  id: SharedRevisionLinkId;
  revisionId: ConfigurationRevisionId;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type CreateSharedRevisionLinkResult =
  | {
      kind: "created" | "replayed";
      link: SharedRevisionLinkSummary;
    }
  | { kind: "conflict"; currentVersion: number }
  | { kind: "idempotency-conflict" }
  | { kind: "token-conflict" }
  | { kind: "unavailable" };

export type RevokeSharedRevisionLinkResult =
  | { kind: "revoked"; revokedAt: Date }
  | { kind: "unchanged"; revokedAt: Date }
  | { kind: "unavailable" };

export type ResolvedSharedRevision = {
  configuration: AnyConfiguratorState;
  productDefinitionVersion: string;
  displaySnapshot: JsonValue;
  expiresAt: Date;
};

/**
 * Shared Revision Links. The owner creates, lists and revokes all of a
 * Project's links; a dealer with the Dealer Grant only those its own Dealer
 * made (ADR 0014).
 */
export type SharingModule = {
  createLink(input: {
    actor: ProjectActor;
    projectId: ProjectId;
    expectedVersion: number;
    idempotencyKey: string;
    token: string;
    displaySnapshot: JsonValue;
  }): Promise<CreateSharedRevisionLinkResult>;

  listLinks(input: {
    actor: ProjectActor;
    projectId: ProjectId;
  }): Promise<SharedRevisionLinkSummary[]>;

  revokeLink(input: {
    actor: ProjectActor;
    projectId: ProjectId;
    linkId: SharedRevisionLinkId;
  }): Promise<RevokeSharedRevisionLinkResult>;

  resolveLink(input: {
    linkId: SharedRevisionLinkId;
    token: string;
  }): Promise<ResolvedSharedRevision | null>;
};
