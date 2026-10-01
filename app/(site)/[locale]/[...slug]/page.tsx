import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { PageBuilder } from "@/components/page-builder/page-builder";
import { isLaunchedLocale } from "@/lib/i18n";
import { loadPage } from "@/sanity/lib/loaders";

/**
 * Every Editorial Page other than the homepage. Slugs are one segment (the
 * schema enforces it), so deeper paths and unknown slugs 404 inside the
 * locale layout, keeping the page's language and the site's styles.
 */
export default async function EditorialPage({ params }: PageProps<"/[locale]/[...slug]">) {
  const { locale, slug } = await params;
  if (!isLaunchedLocale(locale) || slug.length !== 1) notFound();
  const page = await loadPage(locale, slug[0]);
  if (!page) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <PageBuilder locale={locale} page={page} />
      </main>
      <SiteFooter />
    </>
  );
}
