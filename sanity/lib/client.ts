import { createClient } from "next-sanity";
import { apiVersion, dataset, studioProjectId } from "@/sanity/env";

// Always constructed, because createClient throws without a project id; the
// loaders never call it unless isSanityConfigured.
export const client = createClient({
  projectId: studioProjectId,
  dataset,
  apiVersion,
  // The CDN only in production: in development it stacks a second stale cache
  // on Next's, so a seed or Studio edit would show up minutes late.
  useCdn: process.env.NODE_ENV === "production",
  // Public runtime reads published content only (ADR 0007).
  perspective: "published",
  stega: { studioUrl: "/studio" }
});
