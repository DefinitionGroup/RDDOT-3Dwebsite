import { NextResponse } from "next/server";
import { z } from "zod";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { projects } from "@/lib/server/projects/projects";

export const runtime = "nodejs";

const renameSchema = z.object({
  name: z.string().trim().min(1).max(120)
});

/** Renames a Project. The name is the only field a person edits directly. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json(
      { error: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an." },
      { status: 401 }
    );
  }

  const { projectId } = await context.params;
  if (!z.uuid().safeParse(projectId).success) {
    return NextResponse.json({ error: "Das Projekt ist ungültig." }, { status: 400 });
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Der neue Name ist ungültig." }, { status: 400 });
  }

  const body = renameSchema.safeParse(requestBody);
  if (!body.success) {
    return NextResponse.json(
      { error: "Ein Projektname hat 1 bis 120 Zeichen." },
      { status: 400 }
    );
  }

  const result = await projects.renameProject({
    ownerId: session.customerAccountId,
    projectId,
    name: body.data.name
  });
  if (result.kind === "unavailable") {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(
    { project: { id: projectId, name: result.name, updatedAt: result.updatedAt.toISOString() } },
    { headers: { "cache-control": "private, no-store" } }
  );
}
