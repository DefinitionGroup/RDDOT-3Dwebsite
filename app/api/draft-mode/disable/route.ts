import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

/** Leaves Editorial Preview and returns to the page, only ever within this site. */
export async function GET(request: Request) {
  (await draftMode()).disable();
  const requested = new URL(request.url).searchParams.get("redirect") ?? "/";
  const safe = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  return NextResponse.redirect(new URL(safe, request.url));
}
