import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "rotpunkt Signature",
  description: "Premium Küchen, geplant auf den Punkt. Konfigurieren Sie Ihre Signature Küche in 3D.",
  openGraph: {
    title: "rotpunkt Signature",
    description: "Premium Küchen, geplant auf den Punkt.",
    images: ["/images/signature-hero.png"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={sans.variable} lang="de">
      <body>{children}</body>
    </html>
  );
}
