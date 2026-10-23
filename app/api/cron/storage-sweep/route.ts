import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/server/db/database";
import { getObjectStorage } from "@/lib/server/object-storage/object-storage";
import {
  STORAGE_DELETION_HOLD_MS,
  sweepStorageDeletions
} from "@/lib/server/object-storage/storage-deletion-worker";

export const runtime = "nodejs";

/**
 * The daily clean-up of object storage (`vercel.json` crons): deletes stored
 * photos and captures whose rows have been gone for 30 days. Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; without that variable the route does
 * not exist, so nothing can run it from outside.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ code: "not-found" }, { status: 404 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ code: "invalid-delivery" }, { status: 401 });
  }

  const result = await sweepStorageDeletions(getDatabase(), getObjectStorage(), {
    batchSize: 200,
    minimumAgeMs: STORAGE_DELETION_HOLD_MS
  });
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}
