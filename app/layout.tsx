import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import { MotionProvider } from "@/components/design-system/motion-provider";
import "./globals.css";

// One family plus one serif face, self-hosted through next/font at build time.
const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-serif",
  display: "swap"
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "rotpunkt Signature",
  description:
    "Modulare Signature-Küchen: in 3D geplant, in Deutschland gefertigt, als Projekt gespeichert.",
  openGraph: {
    title: "rotpunkt Signature",
    description: "Die Küche, die bleibt. In 3D geplant, in Deutschland gefertigt.",
    images: ["/images/signature-hero.jpg"]
  }
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${sans.variable} ${serif.variable}`}
      data-scroll-behavior="smooth"
      lang="de"
    >
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
