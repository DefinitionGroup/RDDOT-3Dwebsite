import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/design-system/app-header";
import { Emphasized } from "@/components/design-system/emphasized";
import { Pill } from "@/components/design-system/pill";
import { describeAccountProject } from "@/features/customer-accounts/account-projects";
import { AccountAccess } from "@/features/customer-accounts/ui/account-access";
import { DealerWorkspace } from "@/features/dealers/ui/dealer-workspace";
import { isDevelopmentEmailCaptureActive } from "@/features/transactional-email/adapters/development-capture";
import { sessionPrincipals } from "@/lib/server/auth/customer-session";
import { dealers } from "@/lib/server/dealers/dealers";
import { DEFAULT_LOCALE, localizePath } from "@/lib/i18n";
import { screenLanguageLinks } from "@/lib/language-links";
import { visibleLocale, visibleLocales } from "@/lib/locale-gate";
import { getMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/haendler">): Promise<Metadata> {
  const locale = (await visibleLocale((await params).locale)) ?? DEFAULT_LOCALE;
  const t = getMessages(locale).meta;
  return { title: t.dealerTitle, description: t.dealerDescription };
}

/**
 * The Dealer Workspace (ADR 0014): a Dealer User signs in here with the email
 * code and sees the Projects customers shared with their Dealer. A customer
 * who arrives here is pointed to their own account.
 */
export default async function DealerPage({ params }: PageProps<"/[locale]/haendler">) {
  const locale = await visibleLocale((await params).locale);
  if (!locale) notFound();
  const messages = getMessages(locale);
  const principal = await sessionPrincipals.resolve(await headers());

  let content: React.ReactNode;
  if (!principal) {
    content = (
      <div className="flex justify-center py-6 lg:py-16">
        <AccountAccess
          audience="dealer"
          developmentCaptureEnabled={isDevelopmentEmailCaptureActive()}
          returnTo={localizePath(locale, "/haendler")}
        />
      </div>
    );
  } else if (principal.kind === "customer") {
    content = (
      <div className="max-w-xl py-6 lg:py-16">
        <h1 className="m-0 text-heading">
          <Emphasized text={messages.dealers.customerOnlyTitle} />
        </h1>
        <p className="m-0 mt-6 max-w-[42ch] text-body text-graphite">{messages.dealers.customerOnlyBody}</p>
        <Pill className="mt-8" href={localizePath(locale, "/konto")}>
          {messages.dealers.toAccount}
        </Pill>
      </div>
    );
  } else {
    const shared = await dealers.listSharedProjects({ dealerUserId: principal.session.dealerUserId });
    content = (
      <DealerWorkspace
        dealerName={principal.session.dealerName}
        email={principal.session.email}
        projects={shared.map((project) => ({
          ...describeAccountProject(
            {
              id: project.projectId,
              name: project.name,
              lifecycle: project.lifecycle,
              updatedAt: project.updatedAt,
              trashedAt: null,
              deletionDueAt: null,
              workingConfiguration: project.workingConfiguration
            },
            locale
          ),
          grantedAt: project.grantedAt.toISOString(),
          customer: project.customer
        }))}
      />
    );
  }

  return (
    <main className="min-h-svh bg-canvas px-5 py-6 text-ink sm:px-10 lg:px-[clamp(3rem,7vw,7rem)] lg:py-8">
      <AppHeader
        action={{ href: localizePath(locale, "/configure"), label: messages.appHeader.toConfigurator }}
        className="mx-auto max-w-6xl"
        languages={screenLanguageLinks(locale, await visibleLocales(), (target) =>
          localizePath(target, "/haendler")
        )}
        locale={locale}
        showAccount={false}
      />
      <div className="mx-auto mt-12 max-w-6xl pb-16 lg:mt-16">{content}</div>
    </main>
  );
}
