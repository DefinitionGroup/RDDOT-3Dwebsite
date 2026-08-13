import type { CustomerAccountId } from "@/features/projects/project-module";

export type IdentityAdapter = {
  resolveCustomerAccount(input: {
    provider: "better-auth";
    providerSubject: string;
  }): Promise<CustomerAccountId>;
};
