import type { AnyConfiguratorState } from "@/features/configurator/types";
import type { DealerId, DealerUserId } from "@/features/dealers/dealer-session";
import type { CustomerAccountId, ProjectId } from "@/features/projects/project-module";

/** An active Dealer as the Dealer Directory lists it. */
export type DealerListing = {
  id: DealerId;
  name: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  latitude: number;
  longitude: number;
};

/** What the owner shared with a Dealer: their own contact, copied at granting. */
export type SharedCustomerContact = {
  name: string;
  email: string;
  phone: string;
};

/** An open Dealer Grant as its owner sees it. */
export type DealerGrantSummary = {
  id: string;
  projectId: ProjectId;
  dealer: Pick<DealerListing, "id" | "name" | "street" | "postalCode" | "city" | "phone">;
  grantedAt: Date;
};

export type GrantProjectResult =
  | { kind: "granted" | "replayed"; grant: DealerGrantSummary }
  | { kind: "idempotency-conflict" }
  /** The Dealer does not exist or is no longer active. */
  | { kind: "dealer-unavailable" }
  /** Not the caller's Project, or not active. */
  | { kind: "unavailable" };

export type RevokeDealerGrantResult =
  | { kind: "revoked"; revokedAt: Date }
  | { kind: "unchanged" }
  | { kind: "unavailable" };

/** A Project in the Dealer Workspace. */
export type SharedProject = {
  projectId: ProjectId;
  name: string;
  /** An archived Project is listed but stays closed until its owner restores it. */
  lifecycle: "active" | "archived";
  updatedAt: Date;
  grantedAt: Date;
  customer: SharedCustomerContact;
  workingConfiguration: {
    configuration: AnyConfiguratorState;
    productDefinitionVersion: string;
  };
};

/**
 * The Dealer Directory and the Dealer Grants (ADR 0014). Only the owner grants,
 * switches and revokes; a dealer only reads what is open to it.
 */
export type DealerModule = {
  listDealers(): Promise<DealerListing[]>;

  /**
   * Opens the owner's active Project to every active user of the Dealer. A
   * Project has one open grant: granting another Dealer revokes the previous
   * one in the same transaction; granting the same Dealer again refreshes the
   * contact copy. Idempotent on `idempotencyKey`.
   */
  grantProject(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
    dealerId: DealerId;
    idempotencyKey: string;
    customerContact: SharedCustomerContact;
  }): Promise<GrantProjectResult>;

  /** Ends the Project's open grant; the Dealer's next read or write finds nothing. */
  revokeGrant(input: {
    ownerId: CustomerAccountId;
    projectId: ProjectId;
  }): Promise<RevokeDealerGrantResult>;

  /** The open grants of the owner's Projects that are not in Trash. */
  listGrantsForOwner(input: { ownerId: CustomerAccountId }): Promise<DealerGrantSummary[]>;

  /** The Projects open to the Dealer User's Dealer, most recently changed first. */
  listSharedProjects(input: { dealerUserId: DealerUserId }): Promise<SharedProject[]>;
};
