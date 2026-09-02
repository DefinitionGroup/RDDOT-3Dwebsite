import { NextResponse } from "next/server";
import { z } from "zod";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { getPhotoJobs } from "@/lib/server/photo-jobs/photo-jobs";
import { serializeJob } from "@/features/photo-jobs/serialize-job";

export const runtime = "nodejs";

const requestSchema = z.object({
  expectedVersion: z.number().int().positive(),
  idempotencyKey: z.uuid(),
  scenePresetKey: z.string().min(1).max(64),
  capture: z.object({
    contentType: z.enum(["image/jpeg", "image/png"]),
    byteSize: z.number().int().positive()
  })
});

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

  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Die Anfrage ist ungültig." }, { status: 400 });
  }

  const result = await getPhotoJobs().requestJob({
    ownerId: session.customerAccountId,
    projectId,
    ...body.data
  });

  switch (result.kind) {
    case "conflict":
      return NextResponse.json(
        {
          currentVersion: result.currentVersion,
          error: "Dieses Projekt wurde inzwischen an anderer Stelle geändert."
        },
        { status: 409 }
      );
    case "idempotency-conflict":
      return NextResponse.json(
        { error: "Diese Anfrage wurde bereits mit anderen Daten verwendet." },
        { status: 409 }
      );
    case "quota-exceeded":
      return NextResponse.json(
        { error: "Das Tageslimit für Visualisierungen ist erreicht." },
        { status: 429, headers: { "retry-after": String(result.retryAfterSeconds) } }
      );
    case "unknown-preset":
      return NextResponse.json(
        { error: "Diese Szene steht nicht zur Auswahl." },
        { status: 400 }
      );
    case "unavailable":
      return NextResponse.json(
        { error: "Das Projekt wurde nicht gefunden oder kann nicht bearbeitet werden." },
        { status: 404 }
      );
    default:
      return NextResponse.json(
        {
          job: serializeJob(result.job),
          upload: {
            url: result.upload.url,
            method: result.upload.method,
            headers: result.upload.requiredHeaders,
            expiresAt: result.upload.expiresAt.toISOString()
          }
        },
        {
          status: result.kind === "requested" ? 201 : 200,
          headers: { "cache-control": "private, no-store" }
        }
      );
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { projectId } = await context.params;
  if (!z.uuid().safeParse(projectId).success) {
    return NextResponse.json({ error: "Das Projekt ist ungültig." }, { status: 400 });
  }

  const jobs = await getPhotoJobs().listForProject({
    ownerId: session.customerAccountId,
    projectId
  });

  return NextResponse.json(
    { jobs: jobs.map(serializeJob) },
    { headers: { "cache-control": "private, no-store" } }
  );
}
