import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AppHeader } from "@/components/design-system/app-header";
import { Emphasized } from "@/components/design-system/emphasized";
import { Label } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import {
  getConfiguratorQuote,
  getLocalizedLabel
} from "@/features/configurator/product-definition";
import { AccountAccess } from "@/features/customer-accounts/ui/account-access";
import { isDevelopmentEmailCaptureActive } from "@/features/transactional-email/adapters/development-capture";
import {
  createRevisionDisplaySnapshot,
  UnsupportedProductDefinitionVersionError
} from "@/features/projects/revision-display";
import {
  ConfigurationSummary,
  type ConfigurationSummaryData
} from "@/features/quote-requests/ui/configuration-summary";
import { QuoteRequestForm } from "@/features/quote-requests/ui/quote-request-form";
import { customerSessions } from "@/lib/server/auth/customer-session";
import { projects } from "@/lib/server/projects/projects";
import { DEFAULT_LOCALE, localizePath, type Locale } from "@/lib/i18n";
import { screenLanguageLinks } from "@/lib/language-links";
import { visibleLocale, visibleLocales } from "@/lib/locale-gate";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/anfrage">): Promise<Metadata> {
  const locale = (await visibleLocale((await params).locale)) ?? DEFAULT_LOCALE;
  const t = getMessages(locale).meta;
  return { title: t.requestTitle, description: t.requestDescription };
}

type QuoteRequestPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    project?: string | string[];
    c?: string | string[];
  }>;
};

/**
 * The commercial handoff. A Quote Request needs a signed-in person and a
 * Project, because it pins an immutable revision of that Project (ADR 0003).
 * Guests are asked to save first; nothing here reads a configuration from
 * the URL as if it were the person's plan.
 */
export default async function QuoteRequestPage({ params: routeParams, searchParams }: QuoteRequestPageProps) {
  const locale = await visibleLocale((await routeParams).locale);
  if (!locale) notFound();
  const messages = getMessages(locale);
  const params = await searchParams;
  const projectId =
    typeof params.project === "string" && z.uuid().safeParse(params.project).success
      ? params.project
      : null;
  const guestCode = typeof params.c === "string" ? params.c : null;
  const session = await customerSessions.resolve(await headers());

  const backHref = localizePath(locale, projectId ? `/configure?project=${projectId}` : "/configure");
  // This request in any language: where a sign-in returns, and where the language switch leads.
  const requestPath = (target: Locale) =>
    localizePath(
      target,
      projectId
        ? `/anfrage?project=${projectId}`
        : guestCode
          ? `/anfrage?c=${encodeURIComponent(guestCode)}`
          : "/anfrage"
    );

  let content: React.ReactNode;
  if (!session) {
    content = (
      <AccountAccess
        developmentCaptureEnabled={isDevelopmentEmailCaptureActive()}
        returnTo={requestPath(locale)}
      />
    );
  } else if (!projectId) {
    content = <SaveFirst guestCode={guestCode} locale={locale} />;
  } else {
    const workspace = await projects.getWorkspace({
      ownerId: session.customerAccountId,
      projectId
    });
    if (!workspace || workspace.lifecycle !== "active") {
      content = <Unavailable locale={locale} />;
    } else {
      const summary = describe(workspace.workingConfiguration, locale);
      content = summary ? (
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
          <QuoteRequestForm
            expectedVersion={workspace.workingConfiguration.version}
            projectId={workspace.id}
            projectName={workspace.name}
          />
          <aside className="lg:pt-[6.5rem]">
            <ConfigurationSummary locale={locale} summary={summary} />
          </aside>
        </div>
      ) : (
        <Unavailable locale={locale} reason={messages.request.retiredProduct} />
      );
    }
  }

  return (
    <main className="min-h-svh bg-canvas px-5 py-6 text-ink sm:px-10 lg:px-[clamp(3rem,7vw,7rem)] lg:py-8">
      <AppHeader
        action={{ href: backHref, label: messages.appHeader.toConfiguration }}
        className="mx-auto max-w-6xl"
        languages={screenLanguageLinks(locale, await visibleLocales(), requestPath)}
        locale={locale}
      />
      <div className="mx-auto mt-14 max-w-6xl pb-16 lg:mt-20">{content}</div>
    </main>
  );
}

function describe(
  working: { configuration: Parameters<typeof createRevisionDisplaySnapshot>[0]; productDefinitionVersion: string },
  locale: Locale
): ConfigurationSummaryData | null {
  try {
    const snapshot = createRevisionDisplaySnapshot(
      working.configuration,
      working.productDefinitionVersion,
      locale
    );
    const quote = getConfiguratorQuote(working.configuration);
    return {
      productTitle: snapshot.productTitle,
      layoutLabel: snapshot.layoutLabel,
      cabinetFinish: snapshot.cabinetFinish,
      frontFinish: snapshot.frontFinish,
      lineItems: quote.lineItems.map((item) => ({
        key: item.key,
        label: getLocalizedLabel(item.label, locale),
        quantity: item.quantity,
        totalCents: item.totalCents
      })),
      cabinetDeltaCents: quote.cabinetDeltaCents,
      frontDeltaCents: quote.frontDeltaCents,
      taxCents: quote.taxCents,
      totalCents: quote.totalCents,
      currency: quote.currency
    };
  } catch (error) {
    if (error instanceof UnsupportedProductDefinitionVersionError) return null;
    throw error;
  }
}

function SaveFirst({ guestCode, locale }: { guestCode: string | null; locale: Locale }) {
  const messages = getMessages(locale);
  const t = messages.request;
  const saveHref = localizePath(
    locale,
    guestCode
      ? `/konto?${new URLSearchParams({ intent: "save", import: randomUUID(), c: guestCode }).toString()}`
      : "/configure"
  );
  return (
    <div className="max-w-2xl">
      <Label>{t.label}</Label>
      <h1 className="m-0 mt-5 text-heading">
        <Emphasized text={t.saveFirstTitle} />
      </h1>
      <p className="m-0 mt-6 max-w-[46ch] text-body text-graphite">{t.saveFirstBody}</p>
      <Pill className="mt-10" href={saveHref}>
        {guestCode ? messages.configurator.saveAsProject : messages.appHeader.toConfigurator}
      </Pill>
    </div>
  );
}

function Unavailable({ locale, reason }: { locale: Locale; reason?: string }) {
  const t = getMessages(locale).request;
  return (
    <div className="max-w-2xl">
      <Label>{t.label}</Label>
      <h1 className="m-0 mt-5 text-heading">
        <Emphasized text={t.missingTitle} />
      </h1>
      <p className="m-0 mt-6 max-w-[46ch] text-body text-graphite">{reason ?? t.missingBody}</p>
      <Pill className="mt-10" href={localizePath(locale, "/konto")} variant="secondary">
        {t.toProjects}
      </Pill>
    </div>
  );
}
