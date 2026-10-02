import { notFound } from "next/navigation";
import { PageBuilder } from "@/components/page-builder/page-builder";
import { SiteFrame } from "@/components/page-builder/site-frame";
import { languageLinks } from "@/lib/language-links";
import { visibleLocale, visibleLocales } from "@/lib/locale-gate";
import { loadPage } from "@/sanity/lib/loaders";

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
