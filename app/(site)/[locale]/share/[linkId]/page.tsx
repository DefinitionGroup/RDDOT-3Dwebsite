import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SharedRevisionPage } from "@/features/sharing/ui/shared-revision-page";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { visibleLocale } from "@/lib/locale-gate";
import { getMessages } from "@/lib/messages";

export async function generateMetadata({ params }: PageProps<"/[locale]/share/[linkId]">): Promise<Metadata> {
  const locale = (await visibleLocale((await params).locale)) ?? DEFAULT_LOCALE;
  const t = getMessages(locale).meta;
  return {
    title: t.sharedTitle,
    description: t.sharedDescription,
    referrer: "no-referrer",
    robots: {
      index: false,
      follow: false,
      nocache: true
    }
  };
}

export default async function SharePage({ params }: PageProps<"/[locale]/share/[linkId]">) {
  const { linkId, locale } = await params;
  if (!(await visibleLocale(locale)) || !z.uuid().safeParse(linkId).success) notFound();
  return <SharedRevisionPage linkId={linkId} />;
}
