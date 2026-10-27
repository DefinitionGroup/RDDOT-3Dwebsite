import { NextResponse } from "next/server";
import { AVATAR_INPUT_TYPES, AVATAR_LIMITS } from "@/features/customer-accounts/customer-avatar";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { getCustomerAvatars } from "@/lib/server/customer-accounts/avatars";

export const runtime = "nodejs";

const PRIVATE = { "cache-control": "private, no-store" };

function sessionExpired() {
  return NextResponse.json({ code: "session-expired" }, { status: 401, headers: PRIVATE });
}

/**
 * The signed-in person's photo, as a redirect to a URL that lives two
 * minutes: an `<img src="/api/account/avatar?v=…">` therefore never expires.
 */
export async function GET(request: Request) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) return sessionExpired();
  const url = await getCustomerAvatars().readUrl({ ownerId: session.customerAccountId });
  if (!url) return NextResponse.json({ code: "not-found" }, { status: 404, headers: PRIVATE });
  return NextResponse.redirect(url, { status: 302, headers: PRIVATE });
}

/** Replaces the photo with the picture in the body (JPEG, PNG or WebP, under 4 MB). */
export async function POST(request: Request) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) return sessionExpired();

  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (!(AVATAR_INPUT_TYPES as readonly string[]).includes(contentType)) {
    return NextResponse.json({ code: "avatar-not-an-image" }, { status: 415, headers: PRIVATE });
  }
  if (Number(request.headers.get("content-length") ?? 0) > AVATAR_LIMITS.uploadBytesMax) {
    return NextResponse.json({ code: "avatar-too-large" }, { status: 413, headers: PRIVATE });
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > AVATAR_LIMITS.uploadBytesMax) {
    return NextResponse.json({ code: "avatar-too-large" }, { status: 413, headers: PRIVATE });
  }

  const result = await getCustomerAvatars().saveAvatar({ ownerId: session.customerAccountId, bytes });
  switch (result.kind) {
    case "saved":
      return NextResponse.json(
        { avatar: { id: result.avatar.id, createdAt: result.avatar.createdAt.toISOString() } },
        { headers: PRIVATE }
      );
    case "not-an-image":
      return NextResponse.json({ code: "avatar-not-an-image" }, { status: 400, headers: PRIVATE });
    case "too-small":
      return NextResponse.json({ code: "avatar-too-small" }, { status: 400, headers: PRIVATE });
    case "storage-failed":
      return NextResponse.json({ code: "avatar-storage-failed" }, { status: 502, headers: PRIVATE });
  }
}

/** Removes the photo; the file leaves storage with the daily sweep. */
export async function DELETE(request: Request) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) return sessionExpired();
  const result = await getCustomerAvatars().removeAvatar({ ownerId: session.customerAccountId });
  return NextResponse.json({ removed: result.kind === "removed" }, { headers: PRIVATE });
}
