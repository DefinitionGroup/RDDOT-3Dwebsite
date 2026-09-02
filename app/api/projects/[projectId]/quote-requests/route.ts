import { NextResponse } from "next/server";
import { z } from "zod";
import {
  QUOTE_REQUEST_CONSENT_VERSION,
  quoteRequestSubmissionSchema
} from "@/features/quote-requests/quote-request-contract";
import {
  readQuoteRequestCursor,
  serializeQuoteRequest,
  serializeQuoteRequestPage
} from "@/features/quote-requests/serialize-quote-request";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { quoteRequests } from "@/lib/server/quote-requests/quote-requests";

export const runtime = "nodejs";

const SESSION_EXPIRED = "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.";
const PROJECT_INVALID = "Das Projekt ist ungültig.";

/** Submits a Quote Request for the Project's current Working Configuration. */
export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json({ error: SESSION_EXPIRED }, { status: 401 });
  }

  const { projectId } = await context.params;
  if (!z.uuid().safeParse(projectId).success) {
    return NextResponse.json({ error: PROJECT_INVALID }, { status: 400 });
  }

  const body = quoteRequestSubmissionSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!body.success) {
    return NextResponse.json(
      { error: "Bitte prüfen Sie Ihre Angaben. Name, E-Mail-Adresse und Einwilligung sind erforderlich." },
      { status: 400 }
    );
  }

  const result = await quoteRequests.submit({
    ownerId: session.customerAccountId,
    projectId,
    expectedVersion: body.data.expectedVersion,
    idempotencyKey: body.data.idempotencyKey,
    contact: body.data.contact,
    note: body.data.note,
    consent: { version: QUOTE_REQUEST_CONSENT_VERSION }
  });

  switch (result.kind) {
    case "conflict":
      return NextResponse.json(
        {
          currentVersion: result.currentVersion,
          error: "Dieses Projekt wurde inzwischen an anderer Stelle geändert."
        },
        { status: 409 }
      );
    case "idempotency-conflict":
      return NextResponse.json(
        { error: "Diese Anfrage wurde bereits mit anderen Angaben gesendet." },
        { status: 409 }
      );
    case "unsupported-product-definition":
      return NextResponse.json(
        { error: "Diese Konfiguration verwendet eine nicht mehr verfügbare Produktversion." },
        { status: 409 }
      );
    case "quota-exceeded":
      return NextResponse.json(
        { error: "Das Tageslimit für Anfragen ist erreicht. Bitte versuchen Sie es später erneut." },
        { status: 429, headers: { "retry-after": String(result.retryAfterSeconds) } }
      );
    case "unavailable":
      return NextResponse.json(
        { error: "Das Projekt wurde nicht gefunden oder kann nicht angefragt werden." },
        { status: 404 }
      );
    default:
      return NextResponse.json(
        { quoteRequest: serializeQuoteRequest(result.quoteRequest) },
        {
          status: result.kind === "submitted" ? 201 : 200,
          headers: { "cache-control": "private, no-store" }
        }
      );
  }
}

/** The Project's Quote Requests, newest first. */
export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json({ error: SESSION_EXPIRED }, { status: 401 });
  }

  const { projectId } = await context.params;
  if (!z.uuid().safeParse(projectId).success) {
    return NextResponse.json({ error: PROJECT_INVALID }, { status: 400 });
  }

  const cursor = readQuoteRequestCursor(new URL(request.url));
  if (!cursor.ok) {
    return NextResponse.json({ error: "Der Seitenzeiger ist ungültig." }, { status: 400 });
  }

  const page = await quoteRequests.listForProject({
    ownerId: session.customerAccountId,
    projectId,
    cursor: cursor.cursor
  });

  return NextResponse.json(serializeQuoteRequestPage(page), {
    headers: { "cache-control": "private, no-store" }
  });
}
