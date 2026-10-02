import { notFound } from "next/navigation";
import { PageBuilder } from "@/components/page-builder/page-builder";
import { SiteFrame } from "@/components/page-builder/site-frame";
import { isLaunchedLocale } from "@/lib/i18n";
import { loadPage } from "@/sanity/lib/loaders";

/** The locale's homepage: an Editorial Page like any other, at the locale root. */
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLaunchedLocale(locale)) notFound();
  const page = await loadPage(locale, null);
  if (!page) notFound();

  return (
    <SiteFrame locale={locale}>
      <PageBuilder locale={locale} page={page} />
    </SiteFrame>
  );
}
