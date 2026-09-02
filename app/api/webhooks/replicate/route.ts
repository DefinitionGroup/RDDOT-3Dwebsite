import { NextResponse } from "next/server";
import {
  getPhotoGenerationAdapter,
  getPhotoJobs
} from "@/lib/server/photo-jobs/photo-jobs";

export const runtime = "nodejs";

/**
 * Provider webhook ingress (PLAN.md Phase 3). The adapter verifies the
 * delivery's signature and normalises it; nothing provider-shaped goes
 * further. Deliveries are idempotent on their id, so redeliveries are
 * acknowledged without effect. An unverifiable delivery is refused; a
 * verified one for a job we do not know is acknowledged and logged, because
 * asking the provider to retry it would change nothing.
 */
export async function POST(request: Request) {
  const event = await getPhotoGenerationAdapter().parseWebhook(request);
  if (!event) {
    return NextResponse.json({ error: "Ungültige Zustellung." }, { status: 400 });
  }

  const result = await getPhotoJobs().recordProviderEvent(event);
  if (result.kind === "unknown-reference") {
    console.warn("Photo webhook for an unknown job", { eventId: event.eventId });
  }
  return NextResponse.json(
    { received: result.kind },
    { headers: { "cache-control": "no-store" } }
  );
}
