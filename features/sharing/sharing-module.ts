import type { ConfiguratorState } from "@/features/configurator/types";
import type {
  ConfigurationRevisionId,
  CustomerAccountId,
  JsonValue,
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
  configuration: ConfiguratorState;
  productDefinitionVersion: string;
  displaySnapshot: JsonValue;
  expiresAt: Date;
};

export type SharingModule = {
  createLink(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
    expectedVersion: number;
    idempotencyKey: string;
    token: string;
    displaySnapshot: JsonValue;
  }): Promise<CreateSharedRevisionLinkResult>;

  listLinks(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
  }): Promise<SharedRevisionLinkSummary[]>;

  revokeLink(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
    linkId: SharedRevisionLinkId;
  }): Promise<RevokeSharedRevisionLinkResult>;

  resolveLink(input: {
    linkId: SharedRevisionLinkId;
    token: string;
  }): Promise<ResolvedSharedRevision | null>;
};
