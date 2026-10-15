import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { VisualEditing } from "next-sanity/visual-editing";
import { MotionProvider } from "@/components/design-system/motion-provider";
import { ExitPreview } from "@/components/page-builder/exit-preview";
import { DEFAULT_LOCALE, isLocale, LAUNCHED_LOCALES } from "@/lib/i18n";
import { visibleLocale } from "@/lib/locale-gate";
import { getMessages } from "@/lib/messages";
import { LocaleProvider } from "@/lib/messages/locale-context";
import { isSanityConfigured } from "@/sanity/env";
import { SanityLive } from "@/sanity/lib/live";
import "../../globals.css";

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

/** Editorial Preview is never indexed (ADR 0007). */
export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = getMessages(isLocale(locale) ? locale : DEFAULT_LOCALE).meta;
  const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: "rotpunkt Signature",
    description: t.siteDescription,
    openGraph: {
      title: "rotpunkt Signature",
      description: t.shareDescription,
      images: ["/images/signature-hero.jpg"]
    }
  };
  const { isEnabled } = await draftMode();
  return isEnabled ? { ...metadata, robots: { index: false, follow: false } } : metadata;
}

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark"
};

// Launched locales are prerendered; the proxy turns any other prefix into a
// 404 unless Editorial Preview asks for it. `dynamicParams = false` is not an
// option here: it is inherited by every child segment and breaks their own
// notFound() handling.
export function generateStaticParams() {
  return LAUNCHED_LOCALES.map((locale) => ({ locale }));
}

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const locale = await visibleLocale((await params).locale);
  if (!locale) notFound();
  const { isEnabled: isPreview } = await draftMode();

  return (
    <html
      className={`${sans.variable} ${serif.variable}`}
      data-scroll-behavior="smooth"
      lang={locale}
    >
      <body>
        <LocaleProvider locale={locale}>
          <MotionProvider>{children}</MotionProvider>
        </LocaleProvider>
        {/*
         * Live updates connect the browser to Sanity, so they run only for
         * editors in preview and on a developer's machine. Public visitors
         * never open a connection to Sanity; published changes reach them
         * through server-side revalidation of the "sanity" cache tag.
         */}
        {isSanityConfigured && (isPreview || process.env.NODE_ENV === "development") && <SanityLive />}
        {isSanityConfigured && isPreview && (
          <>
            <VisualEditing />
            <ExitPreview label={getMessages(locale).preview.exit} />
          </>
        )}
      </body>
    </html>
  );
}
