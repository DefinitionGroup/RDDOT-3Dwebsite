import "server-only";

import type {
  TransactionalEmailDelivery,
  TransactionalEmailMessage
} from "@/features/transactional-email/transactional-email";

export type DevelopmentEmailCapture = {
  message: TransactionalEmailMessage;
  capturedAt: Date;
};

declare global {
  var __rddotDevelopmentEmailCaptures: DevelopmentEmailCapture[] | undefined;
}

const maximumCaptures = 20;
const captureLifetimeMs = 10 * 60 * 1000;

function captures() {
  globalThis.__rddotDevelopmentEmailCaptures ??= [];
  return globalThis.__rddotDevelopmentEmailCaptures;
}

function discardExpiredCaptures(now = Date.now()) {
  globalThis.__rddotDevelopmentEmailCaptures = captures().filter(
    (capture) => now - capture.capturedAt.getTime() < captureLifetimeMs
  );
}

export function createDevelopmentCaptureEmailDelivery(): TransactionalEmailDelivery {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development email capture cannot run in production");
  }

  return {
    async send(message) {
      discardExpiredCaptures();
      captures().unshift({ message, capturedAt: new Date() });
      globalThis.__rddotDevelopmentEmailCaptures = captures().slice(
        0,
        maximumCaptures
      );

      return {
        providerMessageId: `development-capture-${crypto.randomUUID()}`
      };
    }
  };
}

export function findLatestDevelopmentEmailCapture(recipient: string) {
  discardExpiredCaptures();
  const normalizedRecipient = recipient.trim().toLowerCase();
  return captures().find(
    (capture) => capture.message.recipient.toLowerCase() === normalizedRecipient
  );
}

export function clearDevelopmentEmailCaptures() {
  globalThis.__rddotDevelopmentEmailCaptures = [];
}
