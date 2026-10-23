import { NextResponse } from "next/server";
import { customerProfileSchema } from "@/features/customer-accounts/customer-profile";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { customerProfiles } from "@/lib/server/customer-accounts/profiles";

export const runtime = "nodejs";

/** Replaces the signed-in person's profile; every field is optional (`customerProfileSchema`). */
export async function PUT(request: Request) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json({ code: "session-expired" }, { status: 401 });
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ code: "invalid-profile" }, { status: 400 });
  }

  const body = customerProfileSchema.safeParse(requestBody);
  if (!body.success) {
    return NextResponse.json({ code: "invalid-profile" }, { status: 400 });
  }

  const profile = await customerProfiles.saveProfile({
    ownerId: session.customerAccountId,
    profile: body.data
  });

  return NextResponse.json({ profile }, { headers: { "cache-control": "private, no-store" } });
}
