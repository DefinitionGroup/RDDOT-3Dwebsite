/**
 * The provider boundary (ADR 0008). Provider SDK types, prediction identifiers,
 * and delivery URLs never cross this Interface — the module receives bytes and
 * a model identifier for the evidence trail, nothing else. Replacing Replicate
 * with an EU-hostable generator is meant to be an implementation swap here.
 */

export type PhotoGenerationRequest = {
  /** The validated Source Capture, as bytes. */
  capture: Uint8Array;
  captureContentType: "image/jpeg" | "image/png";
  /**
   * A short-lived, read-only HTTPS URL to the same bytes in the application's
   * own object storage, whose path ends in the capture's file extension. Some
   * providers hand the input URL to a downstream service that fetches it
   * itself, so it must be reachable without credentials for its lifetime.
   * Null when no such grant exists; adapters then fall back to the bytes.
   */
  captureUrl: string | null;
  prompt: string;
  aspectRatio: "16:9";
};

export type PhotoGenerationOutcome =
  | {
      kind: "generated";
      bytes: Uint8Array;
      /** What the provider claims; the module still probes the bytes itself. */
      declaredContentType: string;
      /** Recorded as provenance evidence against the job. */
      modelIdentifier: string;
      providerReference: string | null;
    }
  | {
      kind: "failed";
      /** A stable, customer-safe code such as `provider-timeout`. */
      reason: string;
      retryable: boolean;
      /** The provider's opaque reference, if one was issued before the failure. */
      providerReference?: string | null;
      /**
       * Operator diagnostics (status, provider message). Logged by the adapter,
       * never persisted or shown to a customer.
       */
      detail?: string;
    };

export type PhotoGenerationAdapter = {
  generate(request: PhotoGenerationRequest): Promise<PhotoGenerationOutcome>;
};
