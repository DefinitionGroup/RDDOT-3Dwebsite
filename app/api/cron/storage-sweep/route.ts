import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/server/db/database";
import { getObjectStorage } from "@/lib/server/object-storage/object-storage";
import {
  STORAGE_DELETION_HOLD_MS,
  sweepStorageDeletions
} from "@/lib/server/object-storage/storage-deletion-worker";
import { retireSourceCaptures } from "@/lib/server/photo-jobs/source-capture-retention";

export const runtime = "nodejs";

/**
 * The daily clean-up of object storage (`vercel.json` crons): deletes stored
 * photos and captures whose rows have been gone for 30 days, then retires
 * Source Captures a day after their Photo Job finished, whose objects a later
 * run deletes. Deletions already due go first, so a failing retirement cannot
 * hold them up. Vercel sends `Authorization: Bearer $CRON_SECRET`; without that
 * variable the route does not exist, so nothing can run it from outside.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ code: "not-found" }, { status: 404 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ code: "invalid-delivery" }, { status: 401 });
  }

  const database = getDatabase();
  const storage = await sweepStorageDeletions(database, getObjectStorage(), {
    batchSize: 200,
    minimumAgeMs: STORAGE_DELETION_HOLD_MS
  });
  const captures = await retireSourceCaptures(database);
  return NextResponse.json({ storage, captures }, { headers: { "cache-control": "no-store" } });
}
