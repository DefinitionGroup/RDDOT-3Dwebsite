import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { z } from "zod";
import { AppHeader } from "@/components/design-system/app-header";
import { Label } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
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
          <aside className="lg:pt-[6.5rem]">
            <ConfigurationSummary summary={summary} />
          </aside>
        </div>
      ) : (
        <Unavailable reason="Diese Konfiguration verwendet eine nicht mehr verfügbare Produktversion. Öffnen Sie das Projekt im Konfigurator, um sie zu aktualisieren." />
      );
    }
  }

  return (
    <main className="min-h-svh bg-canvas px-5 py-6 text-ink sm:px-10 lg:px-[clamp(3rem,7vw,7rem)] lg:py-8">
      <AppHeader action={{ href: backHref, label: "Zur Konfiguration" }} className="mx-auto max-w-6xl" />
      <div className="mx-auto mt-14 max-w-6xl pb-16 lg:mt-20">{content}</div>
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
      <Label>Anfrage</Label>
      <h1 className="m-0 mt-5 text-heading">
        Zuerst als <em>Projekt</em> speichern.
      </h1>
      <p className="m-0 mt-6 max-w-[46ch] text-body text-graphite">
        Eine Anfrage bezieht sich immer auf einen festgehaltenen Planungsstand eines
        Projekts. Speichern Sie Ihre Konfiguration, dann fragen Sie sie direkt aus dem
        Projekt heraus an.
      </p>
      <Pill className="mt-10" href={saveHref}>
        {guestCode ? "Als Projekt speichern" : "Zum Konfigurator"}
      </Pill>
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
      <Label>Anfrage</Label>
      <h1 className="m-0 mt-5 text-heading">
        Hier fehlt noch das <em>Projekt</em>.
      </h1>
      <p className="m-0 mt-6 max-w-[46ch] text-body text-graphite">{reason}</p>
      <Pill className="mt-10" href="/konto" variant="secondary">
        Zu meinen Projekten
      </Pill>
    </div>
  );
}
