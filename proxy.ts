import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, isOpenLocale } from "@/lib/i18n";

// Any path no route serves; it lands in `[...slug]`, which calls notFound().
const NOT_LAUNCHED_SEGMENT = "_locale-not-launched";

/** Next.js's draft-mode cookie. */
const DRAFT_MODE_COOKIE = "__prerender_bypass";

/**
 * Locale routing. Every page lives under `app/(site)/[locale]`, but German
 * URLs carry no prefix: `/configure` is served from `/de/configure`, and
 * `/de/configure` redirects to `/configure` so each page has one address.
 * Launched English and Spanish pass through with their prefix; a locale that
 * has not launched is a 404.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";

  if (first === "api" || first === "studio") return NextResponse.next();

  if (first === DEFAULT_LOCALE) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (isOpenLocale(first)) return NextResponse.next();
  // Editorial Preview may look at locales before launch; the route itself
  // verifies the draft-mode cookie, so a forged one still ends in a 404.
  if (isLocale(first) && request.cookies.has(DRAFT_MODE_COOKIE)) return NextResponse.next();

  const url = request.nextUrl.clone();
  if (isLocale(first)) {
    // A locale that has not launched renders the default locale's 404 page.
    url.pathname = `/${DEFAULT_LOCALE}/${NOT_LAUNCHED_SEGMENT}`;
    return NextResponse.rewrite(url);
  }
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip Next internals and anything that looks like a file (icon.svg, videos, images).
  matcher: ["/((?!_next/|.*\\..*).*)"]
};
