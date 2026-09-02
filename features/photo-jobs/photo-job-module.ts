import type { PresignedUpload } from "@/features/object-storage/object-storage-module";
import type { ProviderEvent } from "@/features/photo-jobs/photo-generation-adapter";
import type {
  ConfigurationRevisionId,
  CustomerAccountId,
  ProjectId
} from "@/features/projects/project-module";

export type PhotoJobId = string;

/** Mirrors the lifecycle in PLAN.md §4 and the `photo_job.state` constraint. */
export type PhotoJobState =
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

export const TERMINAL_PHOTO_JOB_STATES: readonly PhotoJobState[] = [
  "succeeded",
  "failed",
  "canceled"
];

/** States in which the provider holds the job and the application waits. */
export const IN_FLIGHT_PHOTO_JOB_STATES: readonly PhotoJobState[] = [
  "submitted",
  "running",
  "uncertain",
  "canceling"
];

export type PhotoJob = {
  id: PhotoJobId;
  projectId: ProjectId;
  revisionId: ConfigurationRevisionId;
  scenePresetKey: string;
  state: PhotoJobState;
  failureReason: string | null;
  /** Provenance evidence: which model the provider ran. */
  modelIdentifier: string | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Present once the job has succeeded and its photo is in EU storage. */
  generatedPhotoId: string | null;
};

export type RequestPhotoJobResult =
  | {
      kind: "requested" | "replayed";
      job: PhotoJob;
      /** Single-use grant for the Source Capture the browser is about to send. */
      upload: PresignedUpload;
    }
  | { kind: "conflict"; currentVersion: number }
  | { kind: "idempotency-conflict" }
  | { kind: "quota-exceeded"; retryAfterSeconds: number }
  /** The Scene Preset is not one the active Prompt Template Release approves. */
  | { kind: "unknown-preset" }
  | { kind: "unavailable" };

export type ConfirmCaptureResult =
  | { kind: "ready"; job: PhotoJob }
  | { kind: "rejected"; job: PhotoJob; reason: string }
  | { kind: "unavailable" };

export type SubmitPhotoJobResult =
  | { kind: "submitted"; job: PhotoJob }
  | { kind: "failed"; job: PhotoJob; reason: string }
  | { kind: "not-runnable"; job: PhotoJob }
  /** The provider-wide daily budget is spent; the job stays capture-ready. */
  | { kind: "budget-exceeded"; job: PhotoJob; retryAfterSeconds: number }
  | { kind: "unavailable" };

export type ReconcilePhotoJobResult =
  | {
      kind: "unchanged" | "progressed" | "succeeded" | "failed" | "canceled";
      job: PhotoJob;
    }
  | { kind: "unavailable" };

export type RecordProviderEventResult =
  | { kind: "applied"; jobId: PhotoJobId }
  | { kind: "duplicate" }
  | { kind: "unknown-reference" };

export type SweepPhotoJobsResult = {
  examined: number;
  progressed: number;
  succeeded: number;
  failed: number;
  canceled: number;
};

export type CancelPhotoJobResult =
  | { kind: "canceled"; job: PhotoJob }
  | { kind: "unchanged"; job: PhotoJob }
  | { kind: "unavailable" };

export type PhotoJobModule = {
  /**
   * Atomically checkpoints the Working Configuration into a Configuration
   * Revision (`trigger = 'photo'`) and creates the job against it, so a photo is
   * always attributable to an exact, immutable configuration rather than to
   * whatever the canvas happened to show (ADR 0008, gap G5). Also reserves the
   * Source Capture and returns its upload grant.
   */
  requestJob(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
    expectedVersion: number;
    idempotencyKey: string;
    scenePresetKey: string;
    capture: { contentType: "image/jpeg" | "image/png"; byteSize: number };
  }): Promise<RequestPhotoJobResult>;

  /**
   * Validates what the browser actually uploaded — presence, declared size,
   * decoded dimensions — and only then lets the job proceed. The capture is
   * untrusted input and is never taken on the client's word (gap G4).
   */
  confirmCapture(input: {
    ownerId: CustomerAccountId;
    jobId: PhotoJobId;
  }): Promise<ConfirmCaptureResult>;

  /**
   * Hands a capture-ready job to the provider and returns as soon as it is
   * accepted. The prompt is rendered from the active Prompt Template Release
   * and the pinned revision's product facts, the model comes from the active
   * Model Release, and both are pinned on the job (gap G6); the provider-wide
   * budget is checked first (gap G7). Completion arrives through
   * `recordProviderEvent` or `reconcileJob`; the job survives the browser
   * that submitted it (gap G2).
   */
  submitJob(input: {
    ownerId: CustomerAccountId;
    jobId: PhotoJobId;
  }): Promise<SubmitPhotoJobResult>;

  /**
   * Applies a verified provider delivery. Idempotent on the delivery id, so
   * redeliveries and out-of-order events cannot double-complete a job. Success
   * is declared only after the validated output is in EU storage (gap G3).
   */
  recordProviderEvent(event: ProviderEvent): Promise<RecordProviderEventResult>;

  /**
   * Reads the provider's view of an in-flight job and applies it, so a lost
   * webhook is recovered on the next read. Throttled per job. Jobs that stay
   * in flight beyond the windows become uncertain and are eventually failed
   * with a best-effort provider cancel.
   */
  reconcileJob(input: {
    ownerId: CustomerAccountId;
    jobId: PhotoJobId;
  }): Promise<ReconcilePhotoJobResult>;

  /** The scheduled counterpart of `reconcileJob`, across every owner. */
  sweepInFlightJobs(input?: { limit?: number }): Promise<SweepPhotoJobsResult>;

  getJob(input: {
    ownerId: CustomerAccountId;
    jobId: PhotoJobId;
  }): Promise<PhotoJob | null>;

  listForProject(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
    limit?: number;
  }): Promise<PhotoJob[]>;

  /** Cancels at the provider on a best-effort basis; the job is terminal either way. */
  cancelJob(input: {
    ownerId: CustomerAccountId;
    jobId: PhotoJobId;
  }): Promise<CancelPhotoJobResult>;
};
