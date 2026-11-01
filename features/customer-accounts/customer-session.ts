import type { DealerSession } from "@/features/dealers/dealer-session";
import type { CustomerAccountId, ProjectActor } from "@/features/projects/project-module";

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

/** Whoever a signed-in request belongs to: a customer or a Dealer User (ADR 0014). */
export type SessionPrincipal =
  | { kind: "customer"; session: CustomerSession }
  | { kind: "dealer"; session: DealerSession };

export type SessionPrincipalResolver = {
  resolve(headers: Headers): Promise<SessionPrincipal | null>;
};

export function projectActorOf(principal: SessionPrincipal): ProjectActor {
  return principal.kind === "customer"
    ? { kind: "owner", customerAccountId: principal.session.customerAccountId }
    : { kind: "dealer", dealerUserId: principal.session.dealerUserId };
}
