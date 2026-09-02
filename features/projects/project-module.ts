import type { AnyConfiguratorState } from "@/features/configurator/types";

export type CustomerAccountId = string;
export type ProjectId = string;
export type ConfigurationRevisionId = string;

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ProjectWorkspace = {
  id: ProjectId;
  name: string;
  lifecycle: "active" | "archived" | "trashed";
  workingConfiguration: {
    configuration: AnyConfiguratorState;
    version: number;
    configurationHash: string;
    productDefinitionVersion: string;
    updatedAt: Date;
  };
};

export type ProjectSummary = {
  id: ProjectId;
  name: string;
  lifecycle: "active" | "archived" | "trashed";
  updatedAt: Date;
};

export type ConfigurationRevisionSummary = {
  id: ConfigurationRevisionId;
  label: string | null;
  trigger: "version-save" | "share" | "photo" | "quote";
  displaySnapshot: JsonValue;
  createdAt: Date;
};

export type ConfigurationRevisionPage = {
  items: ConfigurationRevisionSummary[];
  totalCount: number;
  nextCursor: { createdAt: Date; id: ConfigurationRevisionId } | null;
};

export type SaveWorkingConfigurationResult =
  | {
      kind: "saved";
      version: number;
      configurationHash: string;
      updatedAt: Date;
    }
  | { kind: "conflict"; currentVersion: number }
  | { kind: "unavailable" };

export type CheckpointRevisionResult =
  | {
      kind: "checkpointed";
      revisionId: ConfigurationRevisionId;
      revision: ConfigurationRevisionSummary;
      outboxMessageId: string;
      created: boolean;
    }
  | { kind: "conflict"; currentVersion: number }
  | { kind: "idempotency-conflict" }
  | { kind: "unavailable" };

export type RestoreRevisionResult =
  | {
      kind: "restored";
      configuration: AnyConfiguratorState;
      version: number;
      updatedAt: Date;
    }
  | {
      kind: "unchanged";
      configuration: AnyConfiguratorState;
      version: number;
  }
  | { kind: "conflict"; currentVersion: number }
  | { kind: "unsupported-product-definition"; productDefinitionVersion: string }
  | { kind: "unavailable" };

export type RenameProjectResult =
  | { kind: "renamed"; name: string; updatedAt: Date }
  | { kind: "unavailable" };

export type ProjectModule = {
  listProjects(input: {
    ownerId: CustomerAccountId;
    includeArchived?: boolean;
  }): Promise<ProjectSummary[]>;

  createProject(input: {
    ownerId: CustomerAccountId;
    idempotencyKey: string;
    name: string;
    configuration: unknown;
    productDefinitionVersion: string;
  }): Promise<ProjectWorkspace>;

  getWorkspace(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
  }): Promise<ProjectWorkspace | null>;

  /** Renames a Project the owner can still work in; a trashed one is unavailable. */
  renameProject(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
    name: string;
  }): Promise<RenameProjectResult>;

  listConfigurationRevisions(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
    limit?: number;
    cursor?: { createdAt: Date; id: ConfigurationRevisionId };
  }): Promise<ConfigurationRevisionPage>;

  saveWorkingConfiguration(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
    expectedVersion: number;
    configuration: unknown;
    productDefinitionVersion: string;
  }): Promise<SaveWorkingConfigurationResult>;

  checkpointRevision(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
    expectedVersion: number;
    trigger: "version-save" | "share" | "photo" | "quote";
    label?: string;
    displaySnapshot: JsonValue;
    intent: {
      idempotencyKey: string;
      topic: string;
      payload: JsonValue;
    };
  }): Promise<CheckpointRevisionResult>;

  restoreRevision(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
    revisionId: ConfigurationRevisionId;
    expectedVersion: number;
    safetyDisplaySnapshot: JsonValue;
    supportedProductDefinitionVersions: readonly string[];
  }): Promise<RestoreRevisionResult>;
};
