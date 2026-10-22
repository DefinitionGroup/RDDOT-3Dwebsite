type IndexingEnv = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  SEARCH_INDEXING_ENABLED?: string;
  OPEN_ALL_LOCALES?: string;
  ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION?: string;
};

/**
 * Whether search engines may index this deployment. Only the launched site
 * opts in, with `SEARCH_INDEXING_ENABLED=true` on a production build. Every
 * other deployment says noindex: a developer's machine, every Vercel preview
 * even if the variable reaches it, and any deployment that still carries test
 * settings (open locales, on-screen sign-in codes), which is what Vercel's
 * Production is for now (STATUS.md, Deployment).
 *
 * No imports: `next.config.ts` reads it too.
 */
export function allowsSearchIndexing(
  env: IndexingEnv = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    SEARCH_INDEXING_ENABLED: process.env.SEARCH_INDEXING_ENABLED,
    OPEN_ALL_LOCALES: process.env.OPEN_ALL_LOCALES,
    ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION: process.env.ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION
  }
) {
  if (env.NODE_ENV !== "production") return false;
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "production") return false;
  if (env.OPEN_ALL_LOCALES === "true" || env.ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION === "true") return false;
  return env.SEARCH_INDEXING_ENABLED === "true";
}

export const SEARCH_INDEXING = allowsSearchIndexing();

/** Sent with every response of a deployment that must stay out of search engines. */
export const NOINDEX_HEADER = { key: "X-Robots-Tag", value: "noindex, nofollow" };
