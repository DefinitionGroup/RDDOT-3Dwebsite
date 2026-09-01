import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeJob } from "@/features/photo-jobs/serialize-job";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { getPhotoJobs } from "@/lib/server/photo-jobs/photo-jobs";

export const runtime = "nodejs";

async function resolve(request: Request, jobId: string) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return {
      error: NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 })
    };
  }
  if (!z.uuid().safeParse(jobId).success) {
    return {
      error: NextResponse.json({ error: "Der Auftrag ist ungültig." }, { status: 400 })
    };
  }
  return { ownerId: session.customerAccountId };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params;
  const resolved = await resolve(request, jobId);
  if (resolved.error) return resolved.error;

  const job = await getPhotoJobs().getJob({ ownerId: resolved.ownerId!, jobId });
  if (!job) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(
    { job: serializeJob(job) },
    { headers: { "cache-control": "private, no-store" } }
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params;
  const resolved = await resolve(request, jobId);
  if (resolved.error) return resolved.error;

  const result = await getPhotoJobs().cancelJob({
    ownerId: resolved.ownerId!,
    jobId
  });
  if (result.kind === "unavailable") {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({ job: serializeJob(result.job) });
}
