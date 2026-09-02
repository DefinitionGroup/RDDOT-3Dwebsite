import { z } from "zod";
import type {
  QuoteRequest,
  QuoteRequestCursor,
  QuoteRequestPage
} from "@/features/quote-requests/quote-request-module";

/** The wire shape shared by API routes and client components. */
export type SerializedQuoteRequest = Omit<
  QuoteRequest,
  "createdAt" | "updatedAt" | "consent"
> & {
  consent: { version: string; acceptedAt: string };
  createdAt: string;
  updatedAt: string;
};

export function serializeQuoteRequest(request: QuoteRequest): SerializedQuoteRequest {
  return {
    ...request,
    consent: {
      version: request.consent.version,
      acceptedAt: request.consent.acceptedAt.toISOString()
    },
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString()
  };
}

export type SerializedQuoteRequestPage = {
  quoteRequests: SerializedQuoteRequest[];
  totalCount: number;
  nextCursor: { createdAt: string; id: string } | null;
};

export function serializeQuoteRequestPage(page: QuoteRequestPage): SerializedQuoteRequestPage {
  return {
    quoteRequests: page.items.map(serializeQuoteRequest),
    totalCount: page.totalCount,
    nextCursor: page.nextCursor
      ? { createdAt: page.nextCursor.createdAt.toISOString(), id: page.nextCursor.id }
      : null
  };
}

const cursorSchema = z.object({
  createdAt: z.coerce.date(),
  id: z.uuid()
});

/** Reads `cursorCreatedAt` / `cursorId` the way the revision history does. */
export function readQuoteRequestCursor(
  url: URL
): { ok: true; cursor: QuoteRequestCursor | undefined } | { ok: false } {
  if (!url.searchParams.has("cursorCreatedAt") && !url.searchParams.has("cursorId")) {
    return { ok: true, cursor: undefined };
  }
  const parsed = cursorSchema.safeParse({
    createdAt: url.searchParams.get("cursorCreatedAt"),
    id: url.searchParams.get("cursorId")
  });
  return parsed.success ? { ok: true, cursor: parsed.data } : { ok: false };
}
