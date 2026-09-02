/**
 * The provider boundary (ADR 0008). Provider SDK types, delivery URLs and
 * webhook payloads never cross this Interface. The module receives an opaque
 * provider reference to remember, normalised events and statuses, and — on
 * success — bytes plus a model identifier for the evidence trail. Replacing
 * Replicate with an EU-hostable generator is meant to be an implementation
 * swap here.
 *
 * The provider call is asynchronous (PLAN.md Phase 3): `submit` returns once
 * the provider has accepted the work; completion is learned from a verified
 * webhook event or by `inspect` during reconciliation.
 */

export type PhotoGenerationRequest = {
  /**
   * The validated Source Capture as bytes. Optional: providers that fetch
   * inputs themselves use `captureUrl`, and reading the bytes just to have a
   * fallback would be waste.
   */
  capture?: Uint8Array;
  captureContentType: "image/jpeg" | "image/png";
  /**
   * A short-lived, read-only HTTPS URL to the capture in the application's
   * own object storage, whose path ends in the capture's file extension. Some
   * providers hand the input URL to a downstream service that fetches it
   * itself, so it must be reachable without credentials for its lifetime.
   */
  captureUrl: string | null;
  prompt: string;
  aspectRatio: "16:9";
  /**
   * Where the provider should deliver events. Null submits without a
   * webhook; the job is then completed by reconciliation alone.
   */
  webhookUrl: string | null;
};

export type PhotoGenerationFailure = {
  kind: "failed";
  /** A stable, customer-safe code such as `provider-timeout`. */
  reason: string;
  retryable: boolean;
  providerReference?: string | null;
  /**
   * Operator diagnostics (status, provider message). Logged by the adapter,
   * never persisted or shown to a customer.
   */
  detail?: string;
};

export type SubmitPhotoGenerationOutcome =
  | {
      kind: "submitted";
      /** Opaque; remembered by the module, never interpreted. */
      providerReference: string;
      /** Recorded as provenance evidence against the job. */
      modelIdentifier: string;
    }
  | PhotoGenerationFailure;

export type InspectPhotoGenerationOutcome =
  | { kind: "pending"; started: boolean }
  | {
      kind: "generated";
      bytes: Uint8Array;
      /** What the provider claims; the module still probes the bytes itself. */
      declaredContentType: string;
      modelIdentifier: string;
      providerReference: string;
    }
  | { kind: "canceled" }
  /** The provider has no record of the reference. */
  | { kind: "unknown" }
  | PhotoGenerationFailure;

export type ProviderEventStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

/** A provider delivery, verified and normalised by the adapter. */
export type ProviderEvent = {
  /** The provider's delivery id; redeliveries repeat it. */
  eventId: string;
  providerReference: string;
  status: ProviderEventStatus;
};

export type PhotoGenerationAdapter = {
  submit(request: PhotoGenerationRequest): Promise<SubmitPhotoGenerationOutcome>;
  inspect(providerReference: string): Promise<InspectPhotoGenerationOutcome>;
  /** Best effort; the module reconciles the outcome afterwards. */
  cancel(providerReference: string): Promise<void>;
  /**
   * Verifies a webhook delivery's signature and normalises it. Null when the
   * signature is invalid, the payload is not understood, or no signing secret
   * is configured — the ingress fails closed.
   */
  parseWebhook(request: Request): Promise<ProviderEvent | null>;
};
