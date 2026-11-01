import type { DealerIdentity } from "@/features/dealers/dealer-session";
import type { CustomerAccountId } from "@/features/projects/project-module";

/**
 * Whether an authentication identity belongs to a Dealer User (ADR 0014). A
 * disabled Dealer User or an inactive Dealer is `blocked`: it signs in to
 * nobody rather than falling through to a new Customer Account.
 */
export type DealerUserResolution =
  | { kind: "dealer"; dealer: DealerIdentity }
  | { kind: "blocked" }
  | { kind: "none" };

export type IdentityAdapter = {
  /**
   * Looks for a Dealer User linked to the identity or, on the first sign-in,
   * provisioned with its verified email, and links them. Asked before
   * `resolveCustomerAccount`, so an identity is a Dealer User or a Customer
   * Account, never both.
   */
  resolveDealerUser(input: {
    provider: "better-auth";
    providerSubject: string;
    email: string;
  }): Promise<DealerUserResolution>;

  resolveCustomerAccount(input: {
    provider: "better-auth";
    providerSubject: string;
  }): Promise<CustomerAccountId>;
};
