import { NextResponse } from "next/server";
import { z } from "zod";
import { SUPPORTED_PRODUCT_DEFINITION_VERSIONS } from "@/features/configurator/product-definition";
import {
  createRevisionDisplaySnapshot,
  type RevisionDisplaySnapshot,
  UnsupportedProductDefinitionVersionError
} from "@/features/projects/revision-display";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { projects } from "@/lib/server/projects/projects";

export const runtime = "nodejs";

const restoreSchema = z.object({
  expectedVersion: z.number().int().positive()
});

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; revisionId: string }> }
) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json(
      { code: "session-expired" },
      { status: 401 }
    );
  }

  const { projectId, revisionId } = await context.params;
  if (
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(revisionId).success
  ) {
    return NextResponse.json({ code: "invalid-revision" }, { status: 400 });
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid-request" }, { status: 400 });
  }
  const body = restoreSchema.safeParse(requestBody);
  if (!body.success) {
    return NextResponse.json({ code: "invalid-request" }, { status: 400 });
  }

  const workspace = await projects.getWorkspace({
    ownerId: session.customerAccountId,
    projectId
  });
  if (!workspace || workspace.lifecycle !== "active") {
    return NextResponse.json(
      { code: "project-not-editable" },
      { status: 404 }
    );
  }

  let safetyDisplaySnapshot: RevisionDisplaySnapshot;
  try {
    safetyDisplaySnapshot = createRevisionDisplaySnapshot(
      workspace.workingConfiguration.configuration,
      workspace.workingConfiguration.productDefinitionVersion
    );
  } catch (error) {
    if (!(error instanceof UnsupportedProductDefinitionVersionError)) throw error;
    return NextResponse.json(
      {
        code: "working-version-retired"
      },
      { status: 409 }
    );
  }

  const result = await projects.restoreRevision({
    ownerId: session.customerAccountId,
    projectId,
    revisionId,
    expectedVersion: body.data.expectedVersion,
    safetyDisplaySnapshot,
    supportedProductDefinitionVersions: SUPPORTED_PRODUCT_DEFINITION_VERSIONS
  });

  if (result.kind === "conflict") {
    return NextResponse.json(
      {
        currentVersion: result.currentVersion,
        code: "project-conflict"
      },
      { status: 409 }
    );
  }
  if (result.kind === "unavailable") {
    return NextResponse.json(
      { code: "revision-not-usable" },
      { status: 404 }
    );
  }
  if (result.kind === "unsupported-product-definition") {
    return NextResponse.json(
      {
        code: "historical-version-not-restorable"
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    restored: result.kind === "restored",
    version: result.version
  });
}
