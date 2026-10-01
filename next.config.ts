import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Editorial images from Sanity (ADR 0007: publication-ready media only).
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/06g3ozu4/**" }]
  },
  turbopack: {
    root: process.cwd()
  },
  async redirects() {
    // The prototype "Fake Checkout" is gone; old links land on the request flow.
    return [{ source: "/checkout", destination: "/anfrage", permanent: false }];
  }
};

export default nextConfig;
