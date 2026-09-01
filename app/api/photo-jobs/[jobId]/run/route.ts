import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeJob } from "@/features/photo-jobs/serialize-job";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { getPhotoJobs } from "@/lib/server/photo-jobs/photo-jobs";

export const runtime = "nodejs";
// The provider call is synchronous for now. PLAN.md Phase 3 replaces this with
// predictions plus webhook, at which point this route becomes a submit and the
// client polls GET /api/photo-jobs/[jobId] instead.
export const maxDuration = 300;

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { jobId } = await context.params;
  if (!z.uuid().safeParse(jobId).success) {
    return NextResponse.json({ error: "Der Auftrag ist ungültig." }, { status: 400 });
  }

  const result = await getPhotoJobs().runJob({
    ownerId: session.customerAccountId,
    jobId
  });

  switch (result.kind) {
    case "unavailable":
      return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
    case "not-runnable":
      return NextResponse.json(
        { job: serializeJob(result.job), error: "Der Auftrag ist nicht startbereit." },
        { status: 409 }
      );
    case "failed":
      return NextResponse.json(
        { job: serializeJob(result.job), error: "Die Erzeugung ist fehlgeschlagen." },
        { status: 502 }
      );
    default:
      return NextResponse.json({
        job: serializeJob(result.job),
        generatedPhotoId: result.generatedPhotoId
      });
  }
}
