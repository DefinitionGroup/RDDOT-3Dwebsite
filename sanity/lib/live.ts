import "server-only";
import { defineLive } from "next-sanity/live";
import { client } from "./client";

// A Viewer token. In draft mode the browser receives it too, so it must
// never carry write access.
const token = process.env.SANITY_API_READ_TOKEN;

export const { sanityFetch, SanityLive } = defineLive({
  // The datasets are private (ADR 0007), so published reads need the token as
  // well; defineLive itself only sends it for drafts and stega. This client
  // lives in a server-only module and never reaches the browser.
  client: token ? client.withConfig({ token }) : client,
  serverToken: token,
  browserToken: token
});
