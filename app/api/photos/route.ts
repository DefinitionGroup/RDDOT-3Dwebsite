import { NextResponse } from "next/server";
import { readGalleryCursor, serializeGalleryPage } from "@/app/api/photos/serialize";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { getPhotoGallery } from "@/lib/server/photo-gallery/photo-gallery";

export const runtime = "nodejs";

/** The profile gallery: every Generated Photo the signed-in customer owns. */
export async function GET(request: Request) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json(
      { error: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an." },
      { status: 401 }
    );
  }

  const cursor = readGalleryCursor(new URL(request.url));
  if (!cursor.ok) {
    return NextResponse.json({ error: "Der Seitenzeiger ist ungültig." }, { status: 400 });
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
