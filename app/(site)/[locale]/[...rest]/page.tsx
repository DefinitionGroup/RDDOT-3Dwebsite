import { notFound } from "next/navigation";

// Unknown paths 404 inside the locale layout, so the page keeps its language
// and the site's styles. Becomes the Editorial Page route once Sanity lands.
export default function UnknownPage() {
  notFound();
}
