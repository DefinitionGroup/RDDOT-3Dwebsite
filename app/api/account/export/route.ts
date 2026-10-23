import { NextResponse } from "next/server";
import { customerSessions } from "@/lib/server/auth/customer-session";
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
  const data = await exportCustomerAccount(getDatabase(), {
    ownerId: session.customerAccountId,
    email: session.email,
    profile: await customerProfiles.getProfile({ ownerId: session.customerAccountId }),
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
