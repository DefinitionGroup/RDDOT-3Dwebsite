import type { ConfiguratorState } from "@/features/configurator/types";

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
    configuration: ConfiguratorState;
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
      outboxMessageId: string;
    }
  | { kind: "conflict"; currentVersion: number }
  | { kind: "idempotency-conflict" }
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
};
