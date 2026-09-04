import "server-only";

import type {
  TransactionalEmailDelivery,
  TransactionalEmailMessage
} from "@/features/transactional-email/transactional-email";

export type DevelopmentEmailCapture = {
  message: TransactionalEmailMessage;
  capturedAt: Date;
};

/**
 * Where captured mails live. Local development and test deployments use the
 * Postgres store so the capture survives across serverless instances; unit
 * tests use the in-memory one.
 */
export type DevelopmentEmailCaptureStore = {
  save(capture: DevelopmentEmailCapture): Promise<void>;
  findLatest(recipient: string): Promise<DevelopmentEmailCapture | null>;
  clear(): Promise<void>;
};

export const MAXIMUM_CAPTURES_PER_RECIPIENT = 20;
export const CAPTURE_LIFETIME_MS = 10 * 60 * 1000;

export function normalizeCaptureRecipient(recipient: string) {
  return recipient.trim().toLowerCase();
}

/**
 * The capture adapter is a development tool. Under NODE_ENV=production it is
 * refused unless the deployment opts in explicitly; the opt-in exists for test
 * deployments that have no mail provider yet and must never be set on the
 * customer-facing production project (ADR 0010).
 */
export function isDevelopmentEmailCaptureAllowed(env = process.env) {
  if (env.NODE_ENV !== "production") return true;
  return env.ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION === "true";
}

/** True when the running deployment shows one-time codes on screen. */
export function isDevelopmentEmailCaptureActive(env = process.env) {
  return (
    env.TRANSACTIONAL_EMAIL_PROVIDER?.trim() === "development-capture" &&
    isDevelopmentEmailCaptureAllowed(env)
  );
}

export function createDevelopmentCaptureEmailDelivery(
  store: DevelopmentEmailCaptureStore,
  env = process.env
): TransactionalEmailDelivery {
  if (!isDevelopmentEmailCaptureAllowed(env)) {
    throw new Error(
      "Development email capture cannot run in production. Unset TRANSACTIONAL_EMAIL_PROVIDER, or set ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION=true on a test deployment only."
    );
  }

  return {
    async send(message) {
      await store.save({ message, capturedAt: new Date() });

      return {
        providerMessageId: `development-capture-${crypto.randomUUID()}`
      };
    }
  };
}

export function createInMemoryDevelopmentEmailCaptureStore(
  now: () => number = Date.now
): DevelopmentEmailCaptureStore {
  let captures: DevelopmentEmailCapture[] = [];

  function discardExpired() {
    const cutoff = now() - CAPTURE_LIFETIME_MS;
    captures = captures.filter((capture) => capture.capturedAt.getTime() > cutoff);
  }

  return {
    async save(capture) {
      discardExpired();
      const recipient = normalizeCaptureRecipient(capture.message.recipient);
      const others = captures.filter(
        (existing) =>
          normalizeCaptureRecipient(existing.message.recipient) !== recipient
      );
      const same = captures
        .filter(
          (existing) =>
            normalizeCaptureRecipient(existing.message.recipient) === recipient
        )
        .slice(0, MAXIMUM_CAPTURES_PER_RECIPIENT - 1);
      captures = [capture, ...same, ...others];
    },
    async findLatest(recipient) {
      discardExpired();
      const normalized = normalizeCaptureRecipient(recipient);
      return (
        captures.find(
          (capture) =>
            normalizeCaptureRecipient(capture.message.recipient) === normalized
        ) ?? null
      );
    },
    async clear() {
      captures = [];
    }
  };
}

/** The six-digit one-time code inside a captured authentication mail, if any. */
export function extractOneTimeCode(capture: DevelopmentEmailCapture) {
  return capture.message.text.match(/\b\d{6}\b/)?.[0] ?? null;
}
