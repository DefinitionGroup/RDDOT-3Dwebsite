import { NextResponse } from "next/server";
import { sortByDistance } from "@/features/dealers/dealer-distance";
import { locatePostcode } from "@/features/dealers/postcode-locations";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { customerProfiles } from "@/lib/server/customer-accounts/profiles";
import { dealers } from "@/lib/server/dealers/dealers";

export const runtime = "nodejs";

/**
 * The Dealer Directory for a customer choosing whom to share a Project with:
 * nearest first from `?postcode=` or else the postcode in their profile
 * (ADR 0014). The position is the postcode's, never the visitor's.
 */
export async function GET(request: Request) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json({ code: "session-expired" }, { status: 401 });
  }

  const asked = new URL(request.url).searchParams.get("postcode")?.trim() ?? "";
  const postcode =
    asked || (await customerProfiles.getProfile({ ownerId: session.customerAccountId })).postalCode;
  const origin = postcode ? locatePostcode(postcode) : null;
  const directory = sortByDistance(await dealers.listDealers(), origin);

  return NextResponse.json(
    {
      postcode: origin ? postcode : "",
      origin,
      dealers: directory.map((dealer) => ({
        ...dealer,
        distanceKm: dealer.distanceKm === null ? null : Math.round(dealer.distanceKm)
      }))
    },
    { headers: { "cache-control": "private, no-store" } }
  );
}
