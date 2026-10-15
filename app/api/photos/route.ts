import { NextResponse } from "next/server";
import { readGalleryCursor, serializeGalleryPage } from "@/features/photo-gallery/serialize-gallery";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { getPhotoGallery } from "@/lib/server/photo-gallery/photo-gallery";

export const runtime = "nodejs";

/** The profile gallery: every Generated Photo the signed-in customer owns. */
export async function GET(request: Request) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json(
      { code: "session-expired" },
      { status: 401 }
    );
  }

  const cursor = readGalleryCursor(new URL(request.url));
  if (!cursor.ok) {
    return NextResponse.json({ code: "invalid-cursor" }, { status: 400 });
  }

  const page = await getPhotoGallery().listForAccount({
    ownerId: session.customerAccountId,
    limit: 30,
    cursor: cursor.cursor
  });

  // Presigned URLs must never be cached by a shared cache.
  return NextResponse.json(serializeGalleryPage(page), {
    headers: { "cache-control": "private, no-store" }
  });
}
