"use client";

import { AppHeader } from "@/components/design-system/app-header";
import { Emphasized } from "@/components/design-system/emphasized";
import { Pill } from "@/components/design-system/pill";
import { localizePath } from "@/lib/i18n";
import { useLocale, useMessages } from "@/lib/messages/locale-context";

// A client component: not-found receives no route params, so it reads the
// locale the layout provides.
export default function NotFound() {
  const locale = useLocale();
  const t = useMessages().notFound;
  return (
    <main className="flex min-h-svh flex-col bg-canvas px-5 py-6 text-ink sm:px-10 lg:px-[clamp(3rem,7vw,7rem)] lg:py-8">
      <AppHeader className="mx-auto w-full max-w-6xl" locale={locale} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
        <h1 className="m-0 max-w-[14ch] text-balance text-heading-lg">
          <Emphasized text={t.title} />
        </h1>
        <p className="m-0 max-w-[46ch] text-body text-graphite">{t.body}</p>
        <Pill href={localizePath(locale, "/")}>{t.home}</Pill>
      </div>
    </main>
  );
}
