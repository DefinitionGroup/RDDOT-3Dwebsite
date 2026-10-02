import { defineEnableDraftMode } from "next-sanity/draft-mode";
import { isSanityConfigured } from "@/sanity/env";
import { client } from "@/sanity/lib/client";

/**
 * Entered from the Studio's Presentation tool, which signs the request with
 * a short-lived preview secret; the Viewer token checks that secret against
 * the dataset. Editorial Preview only — never a public route (ADR 0007).
 */
const handler = defineEnableDraftMode({
  client: client.withConfig({ token: process.env.SANITY_API_READ_TOKEN })
});

export const GET = isSanityConfigured
  ? handler.GET
  : async () => new Response("Sanity is not configured; preview is unavailable.", { status: 404 });
