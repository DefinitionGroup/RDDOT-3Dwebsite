import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/design-system/app-header";
import { BrandLogo } from "@/components/design-system/brand-logo";
import { AccountAccess } from "@/features/customer-accounts/ui/account-access";
import { AccountWorkspace } from "@/features/customer-accounts/ui/account-workspace";
import { isDevelopmentEmailCaptureActive } from "@/features/transactional-email/adapters/development-capture";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { serializeQuoteRequestPage } from "@/features/quote-requests/serialize-quote-request";
import { loadInitialGallery } from "@/lib/server/photo-gallery/initial-gallery";
import { projects } from "@/lib/server/projects/projects";
import { quoteRequests } from "@/lib/server/quote-requests/quote-requests";
import { DEFAULT_LOCALE, localizePath, type Locale } from "@/lib/i18n";
import { visibleLocale } from "@/lib/locale-gate";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/konto">): Promise<Metadata> {
  const locale = (await visibleLocale((await params).locale)) ?? DEFAULT_LOCALE;
  const t = getMessages(locale).meta;
  return { title: t.accountTitle, description: t.accountDescription };
}

/** Where a sign-in may return to: a Project in the configurator or its request, in this locale. */
function safeReturn(next: string | string[] | undefined, locale: Locale) {
  const allowed = ["/configure?project=", "/anfrage?project="].map((path) => localizePath(locale, path));
  return typeof next === "string" && allowed.some((prefix) => next.startsWith(prefix))
    ? next
    : localizePath(locale, "/konto");
}

type AccountPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    c?: string | string[];
    import?: string | string[];
    intent?: string | string[];
    next?: string | string[];
  }>;
};

export default async function AccountPage({ params: routeParams, searchParams }: AccountPageProps) {
  const locale = await visibleLocale((await routeParams).locale);
  if (!locale) notFound();
  const messages = getMessages(locale);
  const params = await searchParams;
  const session = await customerSessions.resolve(await headers());
  const [accountProjects, gallery, requests] = session
    ? await Promise.all([
        projects.listProjects({ ownerId: session.customerAccountId }),
        loadInitialGallery({ ownerId: session.customerAccountId }),
        quoteRequests.listForAccount({ ownerId: session.customerAccountId, limit: 10 })
      ])
    : [
        [],
        { photos: [], totalCount: 0, nextCursor: null },
        { items: [], totalCount: 0, nextCursor: null }
      ];

  return (
    <main className="grid min-h-svh bg-canvas text-ink lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
      <section className="relative min-h-[31svh] overflow-hidden bg-charcoal lg:min-h-svh">
        <Image
          alt=""
          className="animate-soft-reveal object-cover object-center lg:object-[58%_center]"
          fill
          loading="eager"
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          src="/images/signature-panorama.webp"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.25)_0%,rgba(0,0,0,0.05)_40%,rgba(0,0,0,0.82)_100%)]"
        />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-10 lg:p-14">
          <BrandLogo href={localizePath(locale, "/")} label={messages.header.home} />
          <p className="m-0 mt-5 max-w-[34ch] text-body text-graphite">{messages.account.intro}</p>
        </div>
      </section>

      <section className="flex min-h-[69svh] flex-col px-5 py-6 sm:px-10 lg:min-h-svh lg:px-[clamp(3rem,7vw,7rem)] lg:py-8">
        <AppHeader
          action={{ href: localizePath(locale, "/configure"), label: messages.appHeader.toConfigurator }}
          locale={locale}
          showAccount={false}
        />

        <div className="flex flex-1 items-center py-10">
          {session ? (
            <AccountWorkspace
              expiresAt={session.expiresAt.toISOString()}
              gallery={gallery}
              pendingImport={
                params.intent === "save" &&
                typeof params.c === "string" &&
                typeof params.import === "string"
                  ? {
                      configurationCode: params.c,
                      idempotencyKey: params.import
                    }
                  : null
              }
              projects={accountProjects.map((project) => ({
                ...project,
                updatedAt: project.updatedAt.toISOString()
              }))}
              quoteRequests={serializeQuoteRequestPage(requests)}
            />
          ) : (
            <AccountAccess
              developmentCaptureEnabled={isDevelopmentEmailCaptureActive()}
              returnTo={safeReturn(params.next, locale)}
            />
          )}
        </div>
      </section>
    </main>
  );
}
