import type { PresignedUpload } from "@/features/object-storage/object-storage-module";
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

export type PhotoJob = {
  id: PhotoJobId;
  projectId: ProjectId;
  revisionId: ConfigurationRevisionId;
  scenePresetKey: string;
  state: PhotoJobState;
  failureReason: string | null;
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
  | { kind: "unavailable" };

export type ConfirmCaptureResult =
  | { kind: "ready"; job: PhotoJob }
  | { kind: "rejected"; job: PhotoJob; reason: string }
  | { kind: "unavailable" };

export type RunPhotoJobResult =
  | { kind: "succeeded"; job: PhotoJob; generatedPhotoId: string }
  | { kind: "failed"; job: PhotoJob; reason: string }
  | { kind: "not-runnable"; job: PhotoJob }
  | { kind: "unavailable" };

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
   * Executes a capture-ready job: provider call, output validation, persistence
   * to EU object storage, then the Generated Photo row. Success is declared only
   * after the validated bytes are stored (gap G3).
   */
  runJob(input: {
    ownerId: CustomerAccountId;
    jobId: PhotoJobId;
  }): Promise<RunPhotoJobResult>;

  getJob(input: {
    ownerId: CustomerAccountId;
    jobId: PhotoJobId;
  }): Promise<PhotoJob | null>;

  listForProject(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
    limit?: number;
  }): Promise<PhotoJob[]>;

  cancelJob(input: {
    ownerId: CustomerAccountId;
    jobId: PhotoJobId;
  }): Promise<CancelPhotoJobResult>;
};
