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
      { code: "session-expired" },
      { status: 401 }
    );
  }

  const { projectId } = await context.params;
  if (!z.uuid().safeParse(projectId).success) {
    return NextResponse.json({ code: "invalid-project" }, { status: 400 });
  }

  const cursor = readGalleryCursor(new URL(request.url));
  if (!cursor.ok) {
    return NextResponse.json({ code: "invalid-cursor" }, { status: 400 });
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
