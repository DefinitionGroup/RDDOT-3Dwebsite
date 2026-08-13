import "server-only";

import { createDevelopmentCaptureEmailDelivery } from "@/features/transactional-email/adapters/development-capture";
import type { TransactionalEmailDelivery } from "@/features/transactional-email/transactional-email";

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
    return createDevelopmentCaptureEmailDelivery();
  }

  throw new Error(`Unsupported transactional email provider: ${provider}`);
}
