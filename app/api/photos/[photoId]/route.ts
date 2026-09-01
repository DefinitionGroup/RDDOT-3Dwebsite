import { NextResponse } from "next/server";
import { z } from "zod";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { getPhotoGallery } from "@/lib/server/photo-gallery/photo-gallery";

export const runtime = "nodejs";

async function resolveOwner(request: Request, photoId: string) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an." },
        { status: 401 }
      )
    };
  }
  if (!z.uuid().safeParse(photoId).success) {
    return {
      error: NextResponse.json({ error: "Das Bild ist ungültig." }, { status: 400 })
    };
  }
  return { ownerId: session.customerAccountId };
}

/** A download grant for one photo. Not the object itself — a short-lived URL. */
export async function GET(
  request: Request,
  context: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await context.params;
  const resolved = await resolveOwner(request, photoId);
  if (resolved.error) return resolved.error;

  const download = await getPhotoGallery().getDownload({
    ownerId: resolved.ownerId!,
    photoId
  });

  // A photo belonging to someone else is indistinguishable from one that does
  // not exist.
  if (!download) {
    return NextResponse.json({ error: "Das Bild wurde nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(
    {
      url: download.url,
      filename: download.filename,
      expiresAt: download.expiresAt.toISOString()
    },
    { headers: { "cache-control": "private, no-store" } }
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await context.params;
  const resolved = await resolveOwner(request, photoId);
  if (resolved.error) return resolved.error;

  const result = await getPhotoGallery().deletePhoto({
    ownerId: resolved.ownerId!,
    photoId
  });

  if (result.kind === "unavailable") {
    return NextResponse.json({ error: "Das Bild wurde nicht gefunden." }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
