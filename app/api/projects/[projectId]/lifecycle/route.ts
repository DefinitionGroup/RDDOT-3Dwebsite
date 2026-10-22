import { NextResponse } from "next/server";
import { z } from "zod";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { projects } from "@/lib/server/projects/projects";

export const runtime = "nodejs";

const lifecycleSchema = z.object({
  action: z.enum(["archive", "trash", "restore"])
});

/** Archives, trashes or restores a Project. Trash revokes its share links for good. */
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
  const body = lifecycleSchema.safeParse(requestBody);
  if (!body.success) {
    return NextResponse.json({ code: "invalid-request" }, { status: 400 });
  }

  const result = await projects.changeProjectLifecycle({
    ownerId: session.customerAccountId,
    projectId,
    action: body.data.action
  });
  if (result.kind === "unavailable") {
    return NextResponse.json({ code: "not-found" }, { status: 404 });
  }
  if (result.kind === "not-allowed") {
    return NextResponse.json(
      { code: "project-lifecycle-conflict", lifecycle: result.lifecycle },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      project: {
        id: projectId,
        lifecycle: result.lifecycle,
        deletionDueAt: result.deletionDueAt?.toISOString() ?? null
      }
    },
    { headers: { "cache-control": "private, no-store" } }
  );
}
