import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createRevisionDisplaySnapshot,
  type RevisionDisplaySnapshot,
  UnsupportedProductDefinitionVersionError
} from "@/features/projects/revision-display";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { projects } from "@/lib/server/projects/projects";
import { sharing } from "@/lib/server/sharing/sharing";

export const runtime = "nodejs";

const createSchema = z.object({
  expectedVersion: z.number().int().positive(),
  idempotencyKey: z.uuid(),
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/)
});

function serializeLink(link: {
  id: string;
  revisionId: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}) {
  return {
    ...link,
    createdAt: link.createdAt.toISOString(),
    expiresAt: link.expiresAt.toISOString(),
    revokedAt: link.revokedAt?.toISOString() ?? null
  };
}

export async function GET(
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

  const links = await sharing.listLinks({
    ownerId: session.customerAccountId,
    projectId
  });
  return NextResponse.json({ links: links.map(serializeLink) });
}

export async function POST(
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

  const body = createSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Die Anfrage ist ungültig." }, { status: 400 });
  }

  const workspace = await projects.getWorkspace({
    ownerId: session.customerAccountId,
    projectId
  });
  if (!workspace || workspace.lifecycle !== "active") {
    return NextResponse.json(
      { error: "Das Projekt wurde nicht gefunden oder kann nicht geteilt werden." },
      { status: 404 }
    );
  }

  let displaySnapshot: RevisionDisplaySnapshot;
  try {
    displaySnapshot = createRevisionDisplaySnapshot(
      workspace.workingConfiguration.configuration,
      workspace.workingConfiguration.productDefinitionVersion
    );
  } catch (error) {
    if (!(error instanceof UnsupportedProductDefinitionVersionError)) throw error;
    return NextResponse.json(
      { error: "Diese Produktversion kann derzeit nicht geteilt werden." },
      { status: 409 }
    );
  }

  const result = await sharing.createLink({
    ownerId: session.customerAccountId,
    projectId,
    expectedVersion: body.data.expectedVersion,
    idempotencyKey: `share:${body.data.idempotencyKey}`,
    token: body.data.token,
    displaySnapshot
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
      { error: "Das Projekt wurde nicht gefunden oder kann nicht geteilt werden." },
      { status: 404 }
    );
  }
  if (result.kind === "idempotency-conflict") {
    return NextResponse.json(
      { error: "Diese Teilen-Anfrage wurde bereits mit anderen Daten verwendet." },
      { status: 409 }
    );
  }
  if (result.kind === "token-conflict") {
    return NextResponse.json(
      {
        code: "token-conflict",
        error: "Der sichere Link konnte nicht erzeugt werden. Bitte erneut versuchen."
      },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { created: result.kind === "created", link: serializeLink(result.link) },
    { status: result.kind === "created" ? 201 : 200 }
  );
}
