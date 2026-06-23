import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "rotpunkt Signature",
  description: "A modular ecommerce foundation for the rotpunkt Signature kitchen experience.",
  openGraph: {
    title: "rotpunkt Signature",
    description: "Premium modular kitchen journeys built from reusable ecommerce components.",
    images: ["/images/signature-hero.png"]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
