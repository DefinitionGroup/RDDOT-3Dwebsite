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
      { code: "session-expired" },
      { status: 401 }
    );
  }

  const { quoteRequestId } = await context.params;
  if (!z.uuid().safeParse(quoteRequestId).success) {
    return NextResponse.json({ code: "invalid-request" }, { status: 400 });
  }

  const quoteRequest = await quoteRequests.get({
    ownerId: session.customerAccountId,
    quoteRequestId
  });
  if (!quoteRequest) {
    return NextResponse.json({ code: "quote-request-not-found" }, { status: 404 });
  }

  return NextResponse.json(
    { quoteRequest: serializeQuoteRequest(quoteRequest) },
    { headers: { "cache-control": "private, no-store" } }
  );
}
