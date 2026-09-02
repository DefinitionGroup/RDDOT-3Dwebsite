import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"]
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
