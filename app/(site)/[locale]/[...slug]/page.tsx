import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBuilder } from "@/components/page-builder/page-builder";
import { SiteFrame } from "@/components/page-builder/site-frame";
import { languageLinks } from "@/lib/language-links";
import { pageMetadata } from "@/lib/page-metadata";
import { visibleLocale, visibleLocales } from "@/lib/locale-gate";
import { loadPage, loadSiteSettings } from "@/sanity/lib/loaders";

export async function generateMetadata({ params }: PageProps<"/[locale]/[...slug]">): Promise<Metadata> {
  const { locale: requested, slug } = await params;
  const locale = await visibleLocale(requested);
  if (!locale || slug.length !== 1) return {};
  const [page, settings] = await Promise.all([
    loadPage(locale, slug[0], { stega: false }),
    loadSiteSettings(locale, { stega: false })
  ]);
  return page ? pageMetadata(page, locale, settings) : {};
}

/**
 * Every Editorial Page other than the homepage. Slugs are one segment (the
 * schema enforces it), so deeper paths and unknown slugs 404 inside the
 * locale layout, keeping the page's language and the site's styles.
 */
export default async function EditorialPage({ params }: PageProps<"/[locale]/[...slug]">) {
  const { locale: requested, slug } = await params;
  const locale = await visibleLocale(requested);
  if (!locale || slug.length !== 1) notFound();
  const page = await loadPage(locale, slug[0]);
  if (!page) notFound();

  return (
    <SiteFrame languages={languageLinks({ ...page, locale }, await visibleLocales())} locale={locale}>
      <PageBuilder locale={locale} page={page} />
    </SiteFrame>
  );
}
