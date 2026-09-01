import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeJob } from "@/features/photo-jobs/serialize-job";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { getPhotoJobs } from "@/lib/server/photo-jobs/photo-jobs";

export const runtime = "nodejs";

/** Confirms the browser's upload landed, and validates it server-side. */
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

  const result = await getPhotoJobs().confirmCapture({
    ownerId: session.customerAccountId,
    jobId
  });

  if (result.kind === "unavailable") {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  if (result.kind === "rejected") {
    return NextResponse.json(
      { job: serializeJob(result.job), error: "Die Aufnahme wurde abgelehnt." },
      { status: 422 }
    );
  }
  return NextResponse.json({ job: serializeJob(result.job) });
}
