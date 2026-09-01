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

export type SourceCaptureTable = {
  id: string;
  projectId: string;
  configurationRevisionId: string;
  storageKey: string;
  contentType: "image/jpeg" | "image/png";
  maxByteSize: number;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  status: "reserved" | "stored" | "rejected";
  rejectionReason: string | null;
  createdAt: Timestamp;
  storedAt: Timestamp | null;
};

export type PhotoJobTable = {
  id: string;
  projectId: string;
  configurationRevisionId: string;
  sourceCaptureId: string | null;
  scenePresetKey: string;
  state:
    | "requested"
    | "capture-ready"
    | "submitted"
    | "running"
    | "validating"
    | "uncertain"
    | "canceling"
    | "succeeded"
    | "failed"
    | "canceled";
  creationIdempotencyKey: string;
  requestHash: string;
  providerReference: string | null;
  failureReason: string | null;
  attempts: Generated<number>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  terminalAt: Timestamp | null;
};

export type GeneratedPhotoTable = {
  id: string;
  photoJobId: string;
  projectId: string;
  configurationRevisionId: string;
  storageKey: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  byteSize: number;
  width: number;
  height: number;
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
  sourceCapture: SourceCaptureTable;
  photoJob: PhotoJobTable;
  generatedPhoto: GeneratedPhotoTable;
};
