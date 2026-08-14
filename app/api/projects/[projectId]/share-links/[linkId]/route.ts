import { NextResponse } from "next/server";
import { z } from "zod";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { sharing } from "@/lib/server/sharing/sharing";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string; linkId: string }> }
) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json(
      { error: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an." },
      { status: 401 }
    );
  }

  const { projectId, linkId } = await context.params;
  if (!z.uuid().safeParse(projectId).success || !z.uuid().safeParse(linkId).success) {
    return NextResponse.json({ error: "Der Link ist ungültig." }, { status: 400 });
  }

  const result = await sharing.revokeLink({
    ownerId: session.customerAccountId,
    projectId,
    linkId
  });
  if (result.kind === "unavailable") {
    return NextResponse.json({ error: "Der Link wurde nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({
    revokedAt: result.revokedAt.toISOString(),
    revoked: result.kind === "revoked"
  });
}
