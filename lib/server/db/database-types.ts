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
  modelIdentifier: string | null;
  submittedAt: Timestamp | null;
  completedAt: Timestamp | null;
  providerCheckedAt: Timestamp | null;
  promptTemplateReleaseId: string | null;
  modelReleaseId: string | null;
  promptText: string | null;
  estimatedCostCents: number | null;
  providerDurationMs: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  terminalAt: Timestamp | null;
};

export type PromptTemplateReleaseTable = {
  id: string;
  key: string;
  version: number;
  template: string;
  scenePresets: JsonValue;
  active: Generated<boolean>;
  approvedBy: string;
  approvedAt: Timestamp;
  createdAt: Timestamp;
};

export type ModelReleaseTable = {
  id: string;
  provider: string;
  modelIdentifier: string;
  versionLabel: string;
  license: string;
  expectations: JsonValue;
  safetyNotes: string;
  pricingBasis: string;
  estimatedCostCents: number;
  evaluationEvidence: string;
  active: Generated<boolean>;
  approvedBy: string;
  approvedAt: Timestamp;
  createdAt: Timestamp;
};

export type PhotoJobProviderEventTable = {
  id: string;
  eventId: string;
  photoJobId: string | null;
  providerReference: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  receivedAt: Timestamp;
  processedAt: Timestamp | null;
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

export type QuoteRequestTable = {
  id: string;
  projectId: string;
  configurationRevisionId: string;
  reference: string;
  state: "submitted" | "in-review" | "answered" | "withdrawn";
  creationIdempotencyKey: string;
  requestHash: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  note: string;
  consentVersion: string;
  consentAcceptedAt: Timestamp;
  priceIndication: JsonValue;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type DevelopmentEmailCaptureTable = {
  id: string;
  recipient: string;
  message: JsonValue;
  capturedAt: Timestamp;
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
  photoJobProviderEvent: PhotoJobProviderEventTable;
  promptTemplateRelease: PromptTemplateReleaseTable;
  modelRelease: ModelReleaseTable;
  quoteRequest: QuoteRequestTable;
  developmentEmailCapture: DevelopmentEmailCaptureTable;
};
