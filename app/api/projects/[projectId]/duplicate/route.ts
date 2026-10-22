import { NextResponse } from "next/server";
import { z } from "zod";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { projects } from "@/lib/server/projects/projects";

export const runtime = "nodejs";

const duplicateSchema = z.object({
  idempotencyKey: z.uuid(),
  /** The copy's name in the page's language; cut to the 120 characters a name may have. */
  name: z
    .string()
    .trim()
    .min(1)
    .transform((name) => name.slice(0, 120).trim())
});

/**
 * Copies a Project's working configuration into a new active Project. The
 * copy starts without versions, share links, photos or requests. A trashed
 * Project cannot be copied; an archived one can.
 */
export async function POST(
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

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid-request" }, { status: 400 });
  }
  const body = duplicateSchema.safeParse(requestBody);
  if (!body.success) {
    return NextResponse.json({ code: "invalid-request" }, { status: 400 });
  }

  const source = await projects.getWorkspace({ ownerId: session.customerAccountId, projectId });
  if (!source || source.lifecycle === "trashed") {
    return NextResponse.json({ code: "not-found" }, { status: 404 });
  }

  const copy = await projects.createProject({
    ownerId: session.customerAccountId,
    idempotencyKey: body.data.idempotencyKey,
    name: body.data.name,
    configuration: source.workingConfiguration.configuration,
    productDefinitionVersion: source.workingConfiguration.productDefinitionVersion
  });

  return NextResponse.json(
    { project: { id: copy.id, name: copy.name } },
    { status: 201, headers: { "cache-control": "private, no-store" } }
  );
}
