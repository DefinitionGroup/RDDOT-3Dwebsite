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

const SESSION_EXPIRED = "session-expired";
const PROJECT_INVALID = "invalid-project";

/** Submits a Quote Request for the Project's current Working Configuration. */
export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const session = await customerSessions.resolve(request.headers);
  if (!session) {
    return NextResponse.json({ code: SESSION_EXPIRED }, { status: 401 });
  }

  const { projectId } = await context.params;
  if (!z.uuid().safeParse(projectId).success) {
    return NextResponse.json({ code: PROJECT_INVALID }, { status: 400 });
  }

  const body = quoteRequestSubmissionSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!body.success) {
    return NextResponse.json(
      { code: "quote-details-required" },
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
          code: "project-conflict"
        },
        { status: 409 }
      );
    case "idempotency-conflict":
      return NextResponse.json(
        { code: "quote-key-reused" },
        { status: 409 }
      );
    case "unsupported-product-definition":
      return NextResponse.json(
        { code: "product-version-retired" },
        { status: 409 }
      );
    case "quota-exceeded":
      return NextResponse.json(
        { code: "quote-daily-limit" },
        { status: 429, headers: { "retry-after": String(result.retryAfterSeconds) } }
      );
    case "unavailable":
      return NextResponse.json(
        { code: "project-not-requestable" },
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
    return NextResponse.json({ code: SESSION_EXPIRED }, { status: 401 });
  }

  const { projectId } = await context.params;
  if (!z.uuid().safeParse(projectId).success) {
    return NextResponse.json({ code: PROJECT_INVALID }, { status: 400 });
  }

  const cursor = readQuoteRequestCursor(new URL(request.url));
  if (!cursor.ok) {
    return NextResponse.json({ code: "invalid-cursor" }, { status: 400 });
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
