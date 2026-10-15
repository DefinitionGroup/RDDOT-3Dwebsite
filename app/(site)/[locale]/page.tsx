import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBuilder } from "@/components/page-builder/page-builder";
import { SiteFrame } from "@/components/page-builder/site-frame";
import { languageLinks } from "@/lib/language-links";
import { pageMetadata } from "@/lib/page-metadata";
import { visibleLocale, visibleLocales } from "@/lib/locale-gate";
import { loadPage, loadSiteSettings } from "@/sanity/lib/loaders";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await visibleLocale((await params).locale);
  if (!locale) return {};
  const [page, settings] = await Promise.all([
    loadPage(locale, null, { stega: false }),
    loadSiteSettings(locale, { stega: false })
  ]);
  return page ? pageMetadata(page, locale, settings) : {};
}

/** The locale's homepage: an Editorial Page like any other, at the locale root. */
export default async function Home({ params }: PageProps<"/[locale]">) {
  const locale = await visibleLocale((await params).locale);
  if (!locale) notFound();
  const page = await loadPage(locale, null);
  if (!page) notFound();

  return (
    <SiteFrame languages={languageLinks({ ...page, locale }, await visibleLocales())} locale={locale}>
      <PageBuilder locale={locale} page={page} />
    </SiteFrame>
  );
}
