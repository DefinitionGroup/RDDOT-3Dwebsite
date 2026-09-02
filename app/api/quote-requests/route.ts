import { NextResponse } from "next/server";
import {
  readQuoteRequestCursor,
  serializeQuoteRequestPage
} from "@/features/quote-requests/serialize-quote-request";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { quoteRequests } from "@/lib/server/quote-requests/quote-requests";

export const runtime = "nodejs";

/** Every Quote Request the signed-in customer has submitted, across Projects. */
export async function GET(request: Request) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json(
      { error: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an." },
      { status: 401 }
    );
  }

  const cursor = readQuoteRequestCursor(new URL(request.url));
  if (!cursor.ok) {
    return NextResponse.json({ error: "Der Seitenzeiger ist ungültig." }, { status: 400 });
  }

  const page = await quoteRequests.listForAccount({
    ownerId: session.customerAccountId,
    cursor: cursor.cursor
  });

  return NextResponse.json(serializeQuoteRequestPage(page), {
    headers: { "cache-control": "private, no-store" }
  });
}
