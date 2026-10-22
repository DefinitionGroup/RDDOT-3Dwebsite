import type { NextConfig } from "next";
import { NOINDEX_HEADER, SEARCH_INDEXING } from "./lib/search-indexing";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Editorial images from Sanity (ADR 0007: publication-ready media only).
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/06g3ozu4/**" }]
  },
  turbopack: {
    root: process.cwd()
  },
  async headers() {
    // Every file of a deployment that is not the launched site, not only its
    // pages: images, models and the film carry no meta tag of their own.
    return SEARCH_INDEXING ? [] : [{ source: "/:path*", headers: [NOINDEX_HEADER] }];
  },
  async redirects() {
    // The prototype "Fake Checkout" is gone; old links land on the request flow.
    return [{ source: "/checkout", destination: "/anfrage", permanent: false }];
  }
};

export default nextConfig;
