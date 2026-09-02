import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getPhotoJobs } from "@/lib/server/photo-jobs/photo-jobs";

export const runtime = "nodejs";
export const maxDuration = 120;

function authorized(request: Request) {
  const expected = process.env.PHOTO_SWEEP_TOKEN?.trim();
  const given = request.headers.get("x-sweep-token")?.trim();
  if (!expected || !given || expected.length !== given.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/**
 * Scheduled reconciliation for jobs the provider still holds (PLAN.md Phase
 * 3). A lost webhook is recovered here at the latest; a job that stays in
 * flight beyond the windows is reported uncertain and eventually failed with
 * a best-effort provider cancel. Fails closed without a configured token —
 * the route then does not exist as far as a caller can tell.
 */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  const result = await getPhotoJobs().sweepInFlightJobs({ limit: 50 });
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}
