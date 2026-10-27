import { NextResponse } from "next/server";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { getCustomerAvatars } from "@/lib/server/customer-accounts/avatars";
import { customerProfiles } from "@/lib/server/customer-accounts/profiles";
import { exportCustomerAccount } from "@/lib/server/db/account-export-postgres";
import { getDatabase } from "@/lib/server/db/database";

export const runtime = "nodejs";

/** "Meine Daten herunterladen": the signed-in person's data as one JSON file. */
export async function GET(request: Request) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json({ code: "session-expired" }, { status: 401 });
  }

  const exportedAt = new Date();
  const [profile, photo] = await Promise.all([
    customerProfiles.getProfile({ ownerId: session.customerAccountId }),
    getCustomerAvatars().readBytes({ ownerId: session.customerAccountId })
  ]);
  const data = await exportCustomerAccount(getDatabase(), {
    ownerId: session.customerAccountId,
    email: session.email,
    profile,
    photo: photo ? `data:image/webp;base64,${Buffer.from(photo).toString("base64")}` : null,
    exportedAt
  });

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "cache-control": "private, no-store",
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="rotpunkt-signature-daten-${exportedAt.toISOString().slice(0, 10)}.json"`
    }
  });
}
