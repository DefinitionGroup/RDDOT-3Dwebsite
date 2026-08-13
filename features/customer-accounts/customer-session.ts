import type { CustomerAccountId } from "@/features/projects/project-module";

export type CustomerSession = {
  customerAccountId: CustomerAccountId;
  sessionId: string;
  expiresAt: Date;
};

export type CustomerSessionResolver = {
  resolve(headers: Headers): Promise<CustomerSession | null>;
};
