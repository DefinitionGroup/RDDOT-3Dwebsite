import "server-only";
import { defineLive } from "next-sanity/live";
import { client } from "./client";

// A Viewer token. Without it the site reads published content only. In draft
// mode the browser receives it too, so it must never carry write access.
const token = process.env.SANITY_API_READ_TOKEN;

export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: token,
  browserToken: token
});
