import type { ColumnType, Generated } from "kysely";

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export type CustomerAccountTable = {
  id: string;
  status: "active" | "pending-deletion";
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type AuthIdentityTable = {
  id: string;
  customerAccountId: string;
  provider: string;
  providerSubject: string;
  createdAt: Timestamp;
};

export type ProjectTable = {
  id: string;
  ownerId: string;
  creationIdempotencyKey: string;
  name: string;
  privateNotes: string;
  lifecycle: "active" | "archived" | "trashed";
  trashedAt: Timestamp | null;
  deletionDueAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type WorkingConfigurationTable = {
  projectId: string;
  normalizedConfiguration: JsonValue;
  configurationHash: string;
  schemaVersion: number;
  productDefinitionVersion: string;
  version: Generated<number>;
  updatedAt: Timestamp;
};

export type ConfigurationRevisionTable = {
  id: string;
  projectId: string;
  normalizedConfiguration: JsonValue;
  configurationHash: string;
  schemaVersion: number;
  productDefinitionVersion: string;
  displaySnapshot: JsonValue;
  trigger: "version-save" | "share" | "photo" | "quote";
  label: string | null;
  createdAt: Timestamp;
};

export type OutboxMessageTable = {
  id: string;
  topic: string;
  aggregateType: string;
  aggregateId: string;
  idempotencyKey: string;
  requestHash: string;
  payload: JsonValue;
  occurredAt: Timestamp;
  availableAt: Timestamp;
  attempts: Generated<number>;
  processedAt: Timestamp | null;
};

export type SharedRevisionLinkTable = {
  id: string;
  projectId: string;
  configurationRevisionId: string;
  tokenHash: string;
  creationIdempotencyKey: string;
  requestHash: string;
  expiresAt: Timestamp;
  revokedAt: Timestamp | null;
  createdAt: Timestamp;
};

export type Database = {
  customerAccount: CustomerAccountTable;
  authIdentity: AuthIdentityTable;
  project: ProjectTable;
  workingConfiguration: WorkingConfigurationTable;
  configurationRevision: ConfigurationRevisionTable;
  sharedRevisionLink: SharedRevisionLinkTable;
  outboxMessage: OutboxMessageTable;
};
