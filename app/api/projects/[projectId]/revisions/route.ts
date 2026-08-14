import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createRevisionDisplaySnapshot,
  parseRevisionDisplaySnapshot,
  type RevisionDisplaySnapshot,
  UnsupportedProductDefinitionVersionError
} from "@/features/projects/revision-display";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { projects } from "@/lib/server/projects/projects";

export const runtime = "nodejs";

const checkpointSchema = z.object({
  expectedVersion: z.number().int().positive(),
  idempotencyKey: z.uuid()
});

const cursorSchema = z.object({
  createdAt: z.coerce.date(),
  id: z.uuid()
});

function serializeRevision(revision: {
  id: string;
  label: string | null;
  trigger: "version-save" | "share" | "photo" | "quote";
  displaySnapshot: Parameters<typeof parseRevisionDisplaySnapshot>[0];
  createdAt: Date;
}) {
  return {
    ...revision,
    displaySnapshot: parseRevisionDisplaySnapshot(revision.displaySnapshot),
    createdAt: revision.createdAt.toISOString()
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

  const url = new URL(request.url);
  const rawCursor = url.searchParams.has("cursorCreatedAt")
    ? {
        createdAt: url.searchParams.get("cursorCreatedAt"),
        id: url.searchParams.get("cursorId")
      }
    : null;
  const cursor = rawCursor ? cursorSchema.safeParse(rawCursor) : null;
  if (cursor && !cursor.success) {
    return NextResponse.json({ error: "Der Seitenzeiger ist ungültig." }, { status: 400 });
  }

  const page = await projects.listConfigurationRevisions({
    ownerId: session.customerAccountId,
    projectId,
    limit: 20,
    cursor: cursor?.data
  });

  return NextResponse.json({
    revisions: page.items.map(serializeRevision),
    totalCount: page.totalCount,
    nextCursor: page.nextCursor
      ? {
          createdAt: page.nextCursor.createdAt.toISOString(),
          id: page.nextCursor.id
        }
      : null
  });
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

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Die Anfrage ist ungültig." }, { status: 400 });
  }

  const body = checkpointSchema.safeParse(requestBody);
  if (!body.success) {
    return NextResponse.json({ error: "Die Anfrage ist ungültig." }, { status: 400 });
  }

  const workspace = await projects.getWorkspace({
    ownerId: session.customerAccountId,
    projectId
  });
  if (!workspace || workspace.lifecycle !== "active") {
    return NextResponse.json(
      { error: "Das Projekt wurde nicht gefunden oder kann nicht bearbeitet werden." },
      { status: 404 }
    );
  }
  if (workspace.workingConfiguration.version !== body.data.expectedVersion) {
    return NextResponse.json(
      {
        currentVersion: workspace.workingConfiguration.version,
        error: "Dieses Projekt wurde inzwischen an anderer Stelle geändert."
      },
      { status: 409 }
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
      {
        error:
          "Diese Konfiguration verwendet eine nicht mehr verfügbare Produktversion."
      },
      { status: 409 }
    );
  }
  const result = await projects.checkpointRevision({
    ownerId: session.customerAccountId,
    projectId,
    expectedVersion: body.data.expectedVersion,
    trigger: "version-save",
    displaySnapshot,
    intent: {
      idempotencyKey: `version-save:${body.data.idempotencyKey}`,
      topic: "project.version-saved",
      payload: { projectId }
    }
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
  if (result.kind === "idempotency-conflict") {
    return NextResponse.json(
      { error: "Diese Speicheranfrage wurde bereits mit anderen Daten verwendet." },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      revision: {
        ...serializeRevision(result.revision)
      },
      created: result.created
    },
    { status: result.created ? 201 : 200 }
  );
}
