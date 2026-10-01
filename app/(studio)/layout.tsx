import type { Metadata } from "next";
import { preloadModule } from "react-dom";

// Lets the Sanity Dashboard embed this Studio and talk to it.
// https://www.sanity.io/docs/dashboard/dashboard-configure
const bridgeScript = "https://core.sanity-cdn.com/bridge.js";

export const metadata: Metadata = {
  title: "Studio | rotpunkt Signature",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true }
};

// The Studio's own root layout: no site styles, fonts, motion provider, or
// live-preview components, which belong to the public site only.
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  preloadModule(bridgeScript, { as: "script" });
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <script async src={bridgeScript} type="module" />
        {children}
      </body>
    </html>
  );
}
