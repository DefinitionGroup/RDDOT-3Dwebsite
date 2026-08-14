import { NextResponse } from "next/server";
import { z } from "zod";
import { RDTD_KITCHEN_PRODUCT_VERSION } from "@/features/configurator/product-definition";
import { decodeConfiguration } from "@/features/configurator/state-codec";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { projects } from "@/lib/server/projects/projects";

export const runtime = "nodejs";

const createProjectSchema = z.object({
  configurationCode: z.string().trim().min(1).max(4_000),
  idempotencyKey: z.uuid()
});

export async function POST(request: Request) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json(
      { error: "Bitte melden Sie sich an, um ein Projekt zu speichern." },
      { status: 401 }
    );
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Die Projektanfrage ist ungültig." },
      { status: 400 }
    );
  }

  const body = createProjectSchema.safeParse(requestBody);
  if (!body.success) {
    return NextResponse.json(
      { error: "Die Projektanfrage ist ungültig." },
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

  const workspace = await projects.createProject({
    ownerId: session.customerAccountId,
    idempotencyKey: `guest-import:${body.data.idempotencyKey}`,
    name: "Meine Signature Küche",
    configuration,
    productDefinitionVersion: RDTD_KITCHEN_PRODUCT_VERSION
  });

  return NextResponse.json(
    {
      project: {
        id: workspace.id,
        name: workspace.name
      }
    },
    { status: 201 }
  );
}
