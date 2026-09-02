import { NextResponse } from "next/server";
import { z } from "zod";
import { serializeQuoteRequest } from "@/features/quote-requests/serialize-quote-request";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { quoteRequests } from "@/lib/server/quote-requests/quote-requests";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ quoteRequestId: string }> }
) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json(
      { error: "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an." },
      { status: 401 }
    );
  }

  const { quoteRequestId } = await context.params;
  if (!z.uuid().safeParse(quoteRequestId).success) {
    return NextResponse.json({ error: "Die Anfrage ist ungültig." }, { status: 400 });
  }

  const quoteRequest = await quoteRequests.get({
    ownerId: session.customerAccountId,
    quoteRequestId
  });
  if (!quoteRequest) {
    return NextResponse.json({ error: "Die Anfrage wurde nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(
    { quoteRequest: serializeQuoteRequest(quoteRequest) },
    { headers: { "cache-control": "private, no-store" } }
  );
}
