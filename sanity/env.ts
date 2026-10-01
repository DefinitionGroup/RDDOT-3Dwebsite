export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION?.trim() || "2026-10-01";

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "development";

/**
 * True when the site reads Sanity. False is demo mode: pages render from the
 * local content in the same shape the queries return (ADR 0007's temporary
 * local-content adapter), and the Studio shows a setup notice.
 */
export const isSanityConfigured = Boolean(projectId);

// Sanity validates its config while bundling, so the Studio shell and the
// client need a well-formed id even in demo mode. Nothing fetches with this
// placeholder: every read checks isSanityConfigured first.
export const studioProjectId = projectId || "demomode";
