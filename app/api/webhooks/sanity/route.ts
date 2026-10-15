import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { parseBody } from "next-sanity/webhook";
import { SANITY_CACHE_TAG } from "@/sanity/lib/loaders";

export const runtime = "nodejs";

type PublishEvent = { _id?: string; _type?: string };

/**
 * Sanity's publish webhook. Public pages read Sanity only on the server and
 * cache every read under the "sanity" tag; visitors never connect to Sanity
 * themselves (ADR 0007). A verified delivery expires that tag, so the next
 * visit to any page renders the published content. Deliveries are signed
 * with SANITY_REVALIDATE_SECRET; anything unsigned or forged is refused.
 * Without the secret the route does not exist as far as a caller can tell.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ code: "not-found" }, { status: 404 });
  }

  // Verifies the signature, then waits briefly so queries see the new content.
  const { isValidSignature, body } = await parseBody<PublishEvent>(request, secret);
  if (!isValidSignature) {
    return NextResponse.json({ code: "invalid-delivery" }, { status: 401 });
  }

  revalidateTag(SANITY_CACHE_TAG, { expire: 0 });
  console.info("Sanity publish revalidated", { type: body?._type ?? null, id: body?._id ?? null });
  return NextResponse.json(
    { revalidated: [SANITY_CACHE_TAG] },
    { headers: { "cache-control": "no-store" } }
  );
}
