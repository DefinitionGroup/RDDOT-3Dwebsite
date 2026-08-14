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

export async function PUT(
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
    return NextResponse.json(
      { error: "Die Speicheranfrage ist ungültig." },
      { status: 400 }
    );
  }

  const body = saveConfigurationSchema.safeParse(requestBody);
  if (!body.success) {
    return NextResponse.json(
      { error: "Die Speicheranfrage ist ungültig." },
      { status: 400 }
    );
  }

  const configuration = decodeConfiguration(body.data.configurationCode);
  if (!configuration) {
    return NextResponse.json(
      { error: "Die Konfiguration konnte nicht gelesen werden." },
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
        error: "Dieses Projekt wurde inzwischen an anderer Stelle geändert."
      },
      { status: 409 }
    );
  }

  if (result.kind === "unavailable") {
    return NextResponse.json(
      { error: "Das Projekt wurde nicht gefunden oder kann nicht bearbeitet werden." },
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
