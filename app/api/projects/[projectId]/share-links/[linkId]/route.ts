import { NextResponse } from "next/server";
import { z } from "zod";
import { projectActors } from "@/lib/server/auth/customer-session";
import { sharing } from "@/lib/server/sharing/sharing";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string; linkId: string }> }
) {
  // The owner, or a Dealer User whose grant the module checks (ADR 0014).
  const actor = await projectActors.resolve(request.headers);
  if (!actor) {
    return NextResponse.json(
      { code: "session-expired" },
      { status: 401 }
    );
  }

  const { projectId, linkId } = await context.params;
  if (!z.uuid().safeParse(projectId).success || !z.uuid().safeParse(linkId).success) {
    return NextResponse.json({ code: "invalid-link" }, { status: 400 });
  }

  const result = await sharing.revokeLink({
    actor,
    projectId,
    linkId
  });
  if (result.kind === "unavailable") {
    return NextResponse.json({ code: "link-not-found" }, { status: 404 });
  }

  return NextResponse.json({
    revokedAt: result.revokedAt.toISOString(),
    revoked: result.kind === "revoked"
  });
}
