import { NextResponse } from "next/server";
import { z } from "zod";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { customerProfiles } from "@/lib/server/customer-accounts/profiles";
import { dealers } from "@/lib/server/dealers/dealers";

export const runtime = "nodejs";

const grantSchema = z.object({
  dealerId: z.uuid(),
  idempotencyKey: z.uuid()
});

/**
 * Shares the owner's Project with a Dealer, or switches it to another one
 * (ADR 0014). The contact the Dealer will see is copied here from the session
 * and the profile, never taken from the request.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json({ code: "session-expired" }, { status: 401 });
  }

  const { projectId } = await context.params;
  if (!z.uuid().safeParse(projectId).success) {
    return NextResponse.json({ code: "invalid-project" }, { status: 400 });
  }
  const body = grantSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ code: "invalid-dealer-grant" }, { status: 400 });
  }

  const profile = await customerProfiles.getProfile({ ownerId: session.customerAccountId });
  const result = await dealers.grantProject({
    ownerId: session.customerAccountId,
    projectId,
    dealerId: body.data.dealerId,
    idempotencyKey: `dealer-grant:${body.data.idempotencyKey}`,
    customerContact: { name: profile.name, email: session.email, phone: profile.phone }
  });

  switch (result.kind) {
    case "unavailable":
      return NextResponse.json({ code: "project-not-shareable" }, { status: 404 });
    case "dealer-unavailable":
      return NextResponse.json({ code: "dealer-unavailable" }, { status: 409 });
    case "idempotency-conflict":
      return NextResponse.json({ code: "dealer-grant-key-reused" }, { status: 409 });
    default:
      return NextResponse.json(
        {
          grant: {
            dealer: result.grant.dealer,
            grantedAt: result.grant.grantedAt.toISOString()
          }
        },
        { status: result.kind === "granted" ? 201 : 200 }
      );
  }
}

/** Ends the Project's Dealer Grant; the Dealer loses access with its next request. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json({ code: "session-expired" }, { status: 401 });
  }

  const { projectId } = await context.params;
  if (!z.uuid().safeParse(projectId).success) {
    return NextResponse.json({ code: "invalid-project" }, { status: 400 });
  }

  const result = await dealers.revokeGrant({ ownerId: session.customerAccountId, projectId });
  if (result.kind === "unavailable") {
    return NextResponse.json({ code: "not-found" }, { status: 404 });
  }
  return NextResponse.json({ revoked: result.kind === "revoked" });
}
