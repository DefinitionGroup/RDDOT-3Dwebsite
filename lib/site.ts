/** The brand when the site settings name none (demo mode, or a dataset without them). */
export const BRAND_NAME = "rotpunkt Signature";

/** The share image when neither the page nor the site settings set one. */
export const DEFAULT_SHARE_IMAGE = "/images/signature-hero.jpg";

/**
 * The public origin canonical URLs, hreflang, the sitemap and share images
 * point at. NEXT_PUBLIC_SITE_URL once the domain is decided; until then the
 * project's production domain on Vercel, so even a preview deployment names
 * production as canonical; locally the dev server.
 */
function readOrigin() {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL?.trim(),
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return new URL(candidate).origin;
    } catch {
      // A malformed value falls through to the next candidate.
    }
  }
  return "http://localhost:3000";
}

export const SITE_ORIGIN = readOrigin();

/** `path` on the public origin: `/en/kitchens` → `https://…/en/kitchens`. */
export function absoluteUrl(path: string) {
  return new URL(path, SITE_ORIGIN).href;
}
