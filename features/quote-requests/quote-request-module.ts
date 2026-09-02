import type {
  ConfigurationRevisionId,
  CustomerAccountId,
  JsonValue,
  ProjectId
} from "@/features/projects/project-module";

export type QuoteRequestId = string;

/**
 * Mirrors the `quote_request.state` constraint. Only `submitted` is written by
 * the First Production Release; the later states exist so a review workflow
 * can arrive without a migration.
 */
export type QuoteRequestState = "submitted" | "in-review" | "answered" | "withdrawn";

export type QuoteRequestContact = {
  name: string;
  email: string;
  phone: string | null;
};

export type QuoteRequest = {
  id: QuoteRequestId;
  /** Customer-facing identifier such as `A-7K3M9Q2X`. */
  reference: string;
  projectId: ProjectId;
  projectName: string;
  revisionId: ConfigurationRevisionId;
  state: QuoteRequestState;
  contact: QuoteRequestContact;
  note: string;
  consent: { version: string; acceptedAt: Date };
  /** The Price Indication as computed at submission. Nonbinding. */
  priceIndication: JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

export type SubmitQuoteRequestResult =
  | { kind: "submitted" | "replayed"; quoteRequest: QuoteRequest }
  | { kind: "conflict"; currentVersion: number }
  | { kind: "idempotency-conflict" }
  | { kind: "quota-exceeded"; retryAfterSeconds: number }
  /** The pinned configuration cannot be described under a supported Product Definition. */
  | { kind: "unsupported-product-definition" }
  | { kind: "unavailable" };

export type QuoteRequestCursor = { createdAt: Date; id: QuoteRequestId };

export type QuoteRequestPage = {
  items: QuoteRequest[];
  totalCount: number;
  nextCursor: QuoteRequestCursor | null;
};

export type QuoteRequestModule = {
  /**
   * Atomically checkpoints the Working Configuration into a Configuration
   * Revision (`trigger = 'quote'`) and records the request against it, so the
   * request is always attributable to an exact, immutable configuration
   * (ADR 0003). The contact, consent and server-computed Price Indication are
   * captured in the same transaction, together with an outbox intent for the
   * later business notification (ADR 0010). Idempotent on `idempotencyKey`.
   */
  submit(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
    expectedVersion: number;
    idempotencyKey: string;
    contact: QuoteRequestContact;
    note: string;
    consent: { version: string };
  }): Promise<SubmitQuoteRequestResult>;

  get(input: {
    ownerId: CustomerAccountId;
    quoteRequestId: QuoteRequestId;
  }): Promise<QuoteRequest | null>;

  listForProject(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
    limit?: number;
    cursor?: QuoteRequestCursor;
  }): Promise<QuoteRequestPage>;

  listForAccount(input: {
    ownerId: CustomerAccountId;
    limit?: number;
    cursor?: QuoteRequestCursor;
  }): Promise<QuoteRequestPage>;
};
