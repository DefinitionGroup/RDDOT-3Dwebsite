import type { CustomerAccountId } from "@/features/projects/project-module";

export type CustomerSession = {
  customerAccountId: CustomerAccountId;
  sessionId: string;
  expiresAt: Date;
  /** The address the person signs in with; shown on the account and offered on requests. */
  email: string;
};

export type CustomerSessionResolver = {
  resolve(headers: Headers): Promise<CustomerSession | null>;
};
