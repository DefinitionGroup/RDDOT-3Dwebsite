import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { z } from "zod";
import { AppHeader } from "@/components/design-system/app-header";
import {
  getConfiguratorQuote,
  getLocalizedLabel
} from "@/features/configurator/product-definition";
import { AccountAccess } from "@/features/customer-accounts/ui/account-access";
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

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Anfrage | rotpunkt Signature",
  description: "Eine gespeicherte Küchenplanung unverbindlich zur Prüfung anfragen."
};

type QuoteRequestPageProps = {
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
export default async function QuoteRequestPage({ searchParams }: QuoteRequestPageProps) {
  const params = await searchParams;
  const projectId =
    typeof params.project === "string" && z.uuid().safeParse(params.project).success
      ? params.project
      : null;
  const guestCode = typeof params.c === "string" ? params.c : null;
  const session = await customerSessions.resolve(await headers());

  const backHref = projectId ? `/configure?project=${projectId}` : "/configure";

  let content: React.ReactNode;
  if (!session) {
    const returnTo = projectId
      ? `/anfrage?project=${projectId}`
      : guestCode
        ? `/anfrage?c=${encodeURIComponent(guestCode)}`
        : "/anfrage";
    content = <AccountAccess returnTo={returnTo} />;
  } else if (!projectId) {
    content = <SaveFirst guestCode={guestCode} />;
  } else {
    const workspace = await projects.getWorkspace({
      ownerId: session.customerAccountId,
      projectId
    });
    if (!workspace || workspace.lifecycle !== "active") {
      content = <Unavailable />;
    } else {
      const summary = describe(workspace.workingConfiguration);
      content = summary ? (
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
          <QuoteRequestForm
            expectedVersion={workspace.workingConfiguration.version}
            projectId={workspace.id}
            projectName={workspace.name}
          />
          <aside className="lg:pt-24">
            <ConfigurationSummary summary={summary} />
          </aside>
        </div>
      ) : (
        <Unavailable reason="Diese Konfiguration verwendet eine nicht mehr verfügbare Produktversion. Öffnen Sie das Projekt im Konfigurator, um sie zu aktualisieren." />
      );
    }
  }

  return (
    <main className="min-h-svh bg-canvas px-6 py-8 text-ink sm:px-10 lg:px-[clamp(3rem,7vw,7rem)] lg:py-10">
      <AppHeader action={{ href: backHref, label: "Zur Konfiguration" }} className="mx-auto max-w-6xl" />
      <div className="mx-auto mt-14 max-w-6xl lg:mt-20">{content}</div>
    </main>
  );
}

function describe(
  working: { configuration: Parameters<typeof createRevisionDisplaySnapshot>[0]; productDefinitionVersion: string }
): ConfigurationSummaryData | null {
  try {
    const snapshot = createRevisionDisplaySnapshot(
      working.configuration,
      working.productDefinitionVersion
    );
    const quote = getConfiguratorQuote(working.configuration);
    return {
      productTitle: snapshot.productTitle,
      layoutLabel: snapshot.layoutLabel,
      cabinetFinish: snapshot.cabinetFinish,
      frontFinish: snapshot.frontFinish,
      lineItems: quote.lineItems.map((item) => ({
        key: item.key,
        label: getLocalizedLabel(item.label, "de"),
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

function SaveFirst({ guestCode }: { guestCode: string | null }) {
  const saveHref = guestCode
    ? `/konto?${new URLSearchParams({ intent: "save", import: randomUUID(), c: guestCode }).toString()}`
    : "/configure";
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-signature">Anfrage</p>
      <h1 className="mt-5 font-editorial text-[clamp(2.6rem,7vw,5.6rem)] leading-[0.92]">
        Zuerst als Projekt speichern.
      </h1>
      <p className="mt-6 max-w-[46ch] text-body leading-7 text-graphite">
        Eine Anfrage bezieht sich immer auf einen festgehaltenen Planungsstand
        eines Projekts. Speichern Sie Ihre Konfiguration, dann fragen Sie sie
        direkt aus dem Projekt heraus an.
      </p>
      <Link
        className="mt-10 inline-flex min-h-12 items-center justify-center bg-signature px-6 text-body text-paper transition-colors duration-300 hover:bg-ink"
        href={saveHref}
      >
        {guestCode ? "Als Projekt speichern" : "Zum Konfigurator"}
      </Link>
    </div>
  );
}

function Unavailable({
  reason = "Das Projekt wurde nicht gefunden oder kann nicht angefragt werden."
}: {
  reason?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-signature">Anfrage</p>
      <h1 className="mt-5 font-editorial text-[clamp(2.6rem,7vw,5.6rem)] leading-[0.92]">
        Hier fehlt noch das Projekt.
      </h1>
      <p className="mt-6 max-w-[46ch] text-body leading-7 text-graphite">{reason}</p>
      <Link
        className="mt-10 inline-flex min-h-12 items-center justify-center bg-ink px-6 text-body text-paper transition-colors duration-300 hover:bg-signature"
        href="/konto"
      >
        Zu meinen Projekten
      </Link>
    </div>
  );
}
