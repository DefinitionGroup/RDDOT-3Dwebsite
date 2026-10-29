import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/design-system/app-header";
import { BrandLogo } from "@/components/design-system/brand-logo";
import { describeAccountProject } from "@/features/customer-accounts/account-projects";
import { AccountAccess } from "@/features/customer-accounts/ui/account-access";
import { readSaveIntent, saveIntentPath } from "@/features/customer-accounts/save-intent";
import { AccountWorkspace } from "@/features/customer-accounts/ui/account-workspace";
import { CONFIG_QUERY_PARAM } from "@/features/configurator/state-codec";
import { isDevelopmentEmailCaptureActive } from "@/features/transactional-email/adapters/development-capture";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { getCustomerAvatars } from "@/lib/server/customer-accounts/avatars";
import { customerProfiles } from "@/lib/server/customer-accounts/profiles";
import { serializeQuoteRequestPage } from "@/features/quote-requests/serialize-quote-request";
import { loadInitialGallery } from "@/lib/server/photo-gallery/initial-gallery";
import { projects } from "@/lib/server/projects/projects";
import { quoteRequests } from "@/lib/server/quote-requests/quote-requests";
import { DEFAULT_LOCALE, localizePath, unlocalizePath, type Locale } from "@/lib/i18n";
import { screenLanguageLinks } from "@/lib/language-links";
import { visibleLocale, visibleLocales } from "@/lib/locale-gate";
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
  const saveIntent = readSaveIntent(params);
  const returnTo = safeReturn(params.next, locale);
  const accountPath = localizePath(locale, "/konto");
  // Another language keeps the pending save, or the return address in that language.
  const languages = screenLanguageLinks(locale, await visibleLocales(), (target) => {
    if (saveIntent) return saveIntentPath(target, saveIntent);
    if (returnTo === accountPath) return localizePath(target, "/konto");
    return localizePath(target, `/konto?next=${encodeURIComponent(localizePath(target, unlocalizePath(returnTo)))}`);
  });
  const session = await customerSessions.resolve(await headers());
  const header = (className?: string) => (
    <AppHeader
      action={{
        // Backing out of a pending save returns to that configuration, not the default kitchen.
        href: localizePath(
          locale,
          saveIntent
            ? `/configure?${CONFIG_QUERY_PARAM}=${encodeURIComponent(saveIntent.configurationCode)}`
            : "/configure"
        ),
        label: messages.appHeader.toConfigurator
      }}
      className={className}
      languages={languages}
      locale={locale}
      showAccount={false}
    />
  );

  // Signed in, the account is a workspace: the whole width, no picture beside it.
  if (session) {
    const [accountProjects, gallery, requests, profile, avatar] = await Promise.all([
      projects.listProjects({ ownerId: session.customerAccountId, includeArchived: true, includeTrashed: true }),
      loadInitialGallery({ ownerId: session.customerAccountId }),
      quoteRequests.listForAccount({ ownerId: session.customerAccountId, limit: 10 }),
      customerProfiles.getProfile({ ownerId: session.customerAccountId }),
      getCustomerAvatars().getAvatar({ ownerId: session.customerAccountId })
    ]);
    return (
      <main className="min-h-svh bg-canvas px-5 py-6 text-ink sm:px-10 lg:px-[clamp(3rem,7vw,7rem)] lg:py-8">
        {header("mx-auto max-w-6xl")}
        <div className="mx-auto mt-12 max-w-6xl pb-16 lg:mt-16">
          <AccountWorkspace
            avatarId={avatar?.id ?? null}
            email={session.email}
            expiresAt={session.expiresAt.toISOString()}
            gallery={gallery}
            pendingImport={saveIntent}
            profile={profile}
            projects={accountProjects.map((project) => describeAccountProject(project, locale))}
            quoteRequests={serializeQuoteRequestPage(requests)}
          />
        </div>
      </main>
    );
  }

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
          {/* The header beside it holds the home link; this is the brand, not a second Tab stop. */}
          <BrandLogo href={null} />
          <p className="m-0 mt-5 max-w-[34ch] text-body text-graphite">{messages.account.intro}</p>
        </div>
      </section>

      <section className="flex min-h-[69svh] flex-col px-5 py-6 sm:px-10 lg:min-h-svh lg:px-[clamp(3rem,7vw,7rem)] lg:py-8">
        {header()}

        <div className="flex flex-1 items-center py-10">
          <AccountAccess
            developmentCaptureEnabled={isDevelopmentEmailCaptureActive()}
            returnTo={saveIntent ? saveIntentPath(locale, saveIntent) : returnTo}
          />
        </div>
      </section>
    </main>
  );
}
