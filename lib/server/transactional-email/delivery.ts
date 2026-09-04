import "server-only";

import { createDevelopmentCaptureEmailDelivery } from "@/features/transactional-email/adapters/development-capture";
import type { TransactionalEmailDelivery } from "@/features/transactional-email/transactional-email";
import { getDatabase } from "@/lib/server/db/database";
import { createPostgresDevelopmentEmailCaptureStore } from "@/lib/server/db/development-email-capture-postgres";

function unavailableDelivery(reason: string): TransactionalEmailDelivery {
  return {
    async send() {
      throw new Error(reason);
    }
  };
}

export function createTransactionalEmailDeliveryFromEnvironment(): TransactionalEmailDelivery {
  const provider = process.env.TRANSACTIONAL_EMAIL_PROVIDER?.trim();

  if (!provider) {
    return unavailableDelivery(
      "Authentication OTP delivery is not configured. Set TRANSACTIONAL_EMAIL_PROVIDER after provisioning the production email provider."
    );
  }

  if (provider === "development-capture") {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[transactional-email] Development email capture is active in a production build. Authentication codes are shown on screen and no mail is sent. This must be a test deployment (ADR 0010)."
      );
    }

    return createDevelopmentCaptureEmailDelivery(
      createPostgresDevelopmentEmailCaptureStore(getDatabase())
    );
  }

  throw new Error(`Unsupported transactional email provider: ${provider}`);
}
