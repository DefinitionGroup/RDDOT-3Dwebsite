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
    return NextResponse.json({ code: "signed-out" }, { status: 401 });
  }

  const { jobId } = await context.params;
  if (!z.uuid().safeParse(jobId).success) {
    return NextResponse.json({ code: "invalid-job" }, { status: 400 });
  }

  const result = await getPhotoJobs().confirmCapture({
    ownerId: session.customerAccountId,
    jobId
  });

  if (result.kind === "unavailable") {
    return NextResponse.json({ code: "not-found" }, { status: 404 });
  }
  if (result.kind === "rejected") {
    return NextResponse.json(
      { job: serializeJob(result.job), code: "capture-rejected" },
      { status: 422 }
    );
  }
  return NextResponse.json({ job: serializeJob(result.job) });
}
