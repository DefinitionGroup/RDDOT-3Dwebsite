import { NextResponse } from "next/server";
import { z } from "zod";
import { RDTD_KITCHEN_PRODUCT_VERSION } from "@/features/configurator/product-definition";
import { decodeConfiguration } from "@/features/configurator/state-codec";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { projects } from "@/lib/server/projects/projects";

export const runtime = "nodejs";

const saveConfigurationSchema = z.object({
  configurationCode: z.string().trim().min(1).max(4_000),
  expectedVersion: z.number().int().positive()
});

/**
 * The current Working Configuration version. Callers that need to pin an exact
 * configuration — the Photo Job request, for one — read it here rather than
 * guessing, and let the write itself resolve any race with a 409.
 */
export async function GET(
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

  const workspace = await projects.getWorkspace({
    ownerId: session.customerAccountId,
    projectId
  });
  if (!workspace || workspace.lifecycle === "trashed") {
    return NextResponse.json({ code: "not-found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      version: workspace.workingConfiguration.version,
      updatedAt: workspace.workingConfiguration.updatedAt.toISOString()
    },
    { headers: { "cache-control": "private, no-store" } }
  );
}

export async function PUT(
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
    return NextResponse.json(
      { code: "invalid-save-request" },
      { status: 400 }
    );
  }

  const body = saveConfigurationSchema.safeParse(requestBody);
  if (!body.success) {
    return NextResponse.json(
      { code: "invalid-save-request" },
      { status: 400 }
    );
  }

  const configuration = decodeConfiguration(body.data.configurationCode);
  if (!configuration) {
    return NextResponse.json(
      { code: "unreadable-configuration" },
      { status: 400 }
    );
  }

  const result = await projects.saveWorkingConfiguration({
    ownerId: session.customerAccountId,
    projectId,
    expectedVersion: body.data.expectedVersion,
    configuration,
    productDefinitionVersion: RDTD_KITCHEN_PRODUCT_VERSION
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
      { code: "project-not-editable" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    project: {
      configurationHash: result.configurationHash,
      updatedAt: result.updatedAt.toISOString(),
      version: result.version
    }
  });
}
