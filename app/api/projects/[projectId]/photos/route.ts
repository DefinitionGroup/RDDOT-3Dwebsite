import { NextResponse } from "next/server";
import { z } from "zod";
import { readGalleryCursor, serializeGalleryPage } from "@/features/photo-gallery/serialize-gallery";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { getPhotoGallery } from "@/lib/server/photo-gallery/photo-gallery";

export const runtime = "nodejs";

/** The gallery for one Project. */
export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json(
      { error: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an." },
      { status: 401 }
    );
  }

  const { projectId } = await context.params;
  if (!z.uuid().safeParse(projectId).success) {
    return NextResponse.json({ error: "Das Projekt ist ungültig." }, { status: 400 });
  }

  const cursor = readGalleryCursor(new URL(request.url));
  if (!cursor.ok) {
    return NextResponse.json({ error: "Der Seitenzeiger ist ungültig." }, { status: 400 });
  }

  const page = await getPhotoGallery().listForProject({
    ownerId: session.customerAccountId,
    projectId,
    limit: 30,
    cursor: cursor.cursor
  });

  return NextResponse.json(serializeGalleryPage(page), {
    headers: { "cache-control": "private, no-store" }
  });
}
