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
      { code: "session-expired" },
      { status: 401 }
    );
  }

  const { projectId } = await context.params;
  if (!z.uuid().safeParse(projectId).success) {
    return NextResponse.json({ code: "invalid-project" }, { status: 400 });
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid-name" }, { status: 400 });
  }

  const body = renameSchema.safeParse(requestBody);
  if (!body.success) {
    return NextResponse.json(
      { code: "invalid-project-name" },
      { status: 400 }
    );
  }

  const result = await projects.renameProject({
    ownerId: session.customerAccountId,
    projectId,
    name: body.data.name
  });
  if (result.kind === "unavailable") {
    return NextResponse.json({ code: "not-found" }, { status: 404 });
  }

  return NextResponse.json(
    { project: { id: projectId, name: result.name, updatedAt: result.updatedAt.toISOString() } },
    { headers: { "cache-control": "private, no-store" } }
  );
}

/**
 * Deletes a Project in Trash for good. Refused outside Trash and while the
 * Project has Quote Requests, which rotpunkt deletes by hand.
 */
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

  const result = await projects.deleteProject({ ownerId: session.customerAccountId, projectId });
  if (result.kind === "unavailable") {
    return NextResponse.json({ code: "not-found" }, { status: 404 });
  }
  if (result.kind === "not-trashed") {
    return NextResponse.json({ code: "project-not-trashed" }, { status: 409 });
  }
  if (result.kind === "has-requests") {
    return NextResponse.json({ code: "project-has-requests" }, { status: 409 });
  }

  return NextResponse.json({ deleted: projectId }, { headers: { "cache-control": "private, no-store" } });
}
