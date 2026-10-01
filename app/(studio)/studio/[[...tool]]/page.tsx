import { NextStudio } from "next-sanity/studio";
import config from "@/sanity.config";
import { isSanityConfigured } from "@/sanity/env";

export const dynamic = "force-static";
export { metadata, viewport } from "next-sanity/studio";

export default function StudioPage() {
  if (!isSanityConfigured) {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", lineHeight: 1.5, margin: "0 auto", maxWidth: "36rem", padding: "6rem 1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", margin: "0 0 1rem" }}>Studio not connected</h1>
        <p style={{ margin: 0 }}>
          Set <code>NEXT_PUBLIC_SANITY_PROJECT_ID</code> and <code>NEXT_PUBLIC_SANITY_DATASET</code> in{" "}
          <code>.env.local</code> (see <code>.env.example</code>) to mount the Studio. Until then the site
          runs on its local demo content.
        </p>
      </main>
    );
  }
  return <NextStudio config={config} />;
}
