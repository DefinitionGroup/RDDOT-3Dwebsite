import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeJob } from "@/features/photo-jobs/serialize-job";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { getPhotoJobs } from "@/lib/server/photo-jobs/photo-jobs";

export const runtime = "nodejs";

/**
 * Hands a capture-ready job to the provider and returns once it is accepted.
 * The browser then polls GET /api/photo-jobs/[jobId]; the job itself survives
 * the browser (PLAN.md Phase 3, gap G2).
 */
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

  const result = await getPhotoJobs().submitJob({
    ownerId: session.customerAccountId,
    jobId
  });

  switch (result.kind) {
    case "unavailable":
      return NextResponse.json({ code: "not-found" }, { status: 404 });
    case "not-runnable":
      return NextResponse.json(
        { job: serializeJob(result.job), code: "job-not-ready" },
        { status: 409 }
      );
    case "failed":
      return NextResponse.json(
        { job: serializeJob(result.job), code: "generation-not-started" },
        { status: 502 }
      );
    case "budget-exceeded":
      return NextResponse.json(
        {
          job: serializeJob(result.job),
          code: "photo-budget-exhausted"
        },
        { status: 503, headers: { "retry-after": String(result.retryAfterSeconds) } }
      );
    default:
      return NextResponse.json(
        { job: serializeJob(result.job) },
        { status: 202, headers: { "cache-control": "private, no-store" } }
      );
  }
}
