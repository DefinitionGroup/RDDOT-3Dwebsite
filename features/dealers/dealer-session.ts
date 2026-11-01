export type DealerId = string;
export type DealerUserId = string;

/** A provisioned Dealer User as the Identity Adapter resolves them (ADR 0014). */
export type DealerIdentity = {
  dealerUserId: DealerUserId;
  dealerId: DealerId;
  dealerName: string;
  /** The Dealer User's own details, which start the form of a dealer's Quote Request. */
  name: string;
  email: string;
  phone: string;
};

export type DealerSession = DealerIdentity & {
  sessionId: string;
  expiresAt: Date;
};
