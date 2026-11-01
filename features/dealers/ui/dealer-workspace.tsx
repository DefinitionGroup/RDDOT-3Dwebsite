"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Emphasized } from "@/components/design-system/emphasized";
import { Label } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import type { AccountProject } from "@/features/customer-accounts/account-projects";
import type { SharedCustomerContact } from "@/features/dealers/dealer-module";
import { authClient } from "@/lib/auth-client";
import { INTL_LOCALE, SITE_TIME_ZONE, localizePath, type Locale } from "@/lib/i18n";
import { useLocale, useMessages } from "@/lib/messages/locale-context";
import { DURATION, REVEAL_RISE, SIGNATURE_EASE } from "@/lib/motion";

/** A Project in the Dealer Workspace, with the contact its owner shared. */
export type DealerWorkspaceProject = AccountProject & {
  grantedAt: string;
  customer: SharedCustomerContact;
};

function formatDay(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: SITE_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(iso));
}

function CustomerContact({ customer }: { customer: SharedCustomerContact }) {
  const t = useMessages().dealers;
  return (
    <div className="min-w-0">
      <Label as="span">{t.customer}</Label>
      {customer.name && <p className="m-0 mt-2 truncate text-body text-ink">{customer.name}</p>}
      <p className="m-0 mt-1 truncate text-caption">
        <a
          className="text-graphite underline-offset-4 transition-colors duration-state ease-signature hover:text-porcelain hover:underline"
          href={`mailto:${customer.email}`}
        >
          {customer.email}
        </a>
      </p>
      {customer.phone && (
        <p className="m-0 mt-1 text-caption">
          <a
            className="tnum text-graphite underline-offset-4 transition-colors duration-state ease-signature hover:text-porcelain hover:underline"
            href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`}
          >
            {customer.phone}
          </a>
        </p>
      )}
    </div>
  );
}

/** One shared Project: the kitchen in a line, the customer beside it, and the way in. */
function SharedProjectRow({ project }: { project: DealerWorkspaceProject }) {
  const locale = useLocale();
  const messages = useMessages();
  const t = messages.dealers;
  const archived = project.lifecycle === "archived";

  return (
    <li className="grid gap-5 border-t border-hairline py-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center md:gap-8">
      <div className="min-w-0">
        <p className="m-0 truncate text-card">{project.name}</p>
        {project.summary && (
          <p className="m-0 mt-1 text-caption text-graphite">
            {project.summary.layout} ·{" "}
            {messages.account.finishes(project.summary.cabinet.label, project.summary.front.label)}
          </p>
        )}
        <p className="m-0 mt-2 text-caption text-ash">
          {t.sharedSince(formatDay(project.grantedAt, locale))} ·{" "}
          {messages.account.lastChanged(formatDay(project.updatedAt, locale))}
        </p>
      </div>
      <CustomerContact customer={project.customer} />
      <div className="flex items-center justify-between gap-6 md:justify-end">
        {project.summary && (
          <span className="tnum font-display text-[1.25rem] leading-none tracking-[-0.02em]">
            {project.summary.price}
          </span>
        )}
        {!archived && (
          <Pill href={localizePath(locale, `/configure?project=${project.id}`)} variant="secondary">
            {messages.account.open}
          </Pill>
        )}
      </div>
    </li>
  );
}

/**
 * The Dealer Workspace (ADR 0014): the Projects customers shared with this
 * Dealer and the contact each one agreed to show. Nothing else of theirs.
 */
export function DealerWorkspace({
  dealerName,
  email,
  projects
}: {
  dealerName: string;
  email: string;
  projects: DealerWorkspaceProject[];
}) {
  const messages = useMessages();
  const t = messages.dealers;
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const active = projects.filter((project) => project.lifecycle === "active");
  const archived = projects.filter((project) => project.lifecycle === "archived");

  async function signOut() {
    setIsSigningOut(true);
    await authClient.signOut();
    startTransition(() => router.refresh());
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: REVEAL_RISE }}
      transition={{ duration: DURATION.reveal, ease: SIGNATURE_EASE }}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <Label>{dealerName}</Label>
          <h1 className="m-0 mt-4 text-heading">
            <Emphasized text={t.title} />
          </h1>
          <p className="m-0 mt-3 max-w-[52ch] text-body text-graphite">{t.body(dealerName)}</p>
          <p className="m-0 mt-2 truncate text-caption text-ash">{messages.account.signedInAs(email)}</p>
        </div>
        <Pill className="-mr-5" disabled={isSigningOut} onClick={signOut} variant="ghost">
          {isSigningOut ? messages.account.signingOut : messages.account.signOut}
        </Pill>
      </div>

      <section aria-labelledby="shared-projects-heading" className="mt-12 lg:mt-16">
        <div className="flex items-baseline gap-4 border-t border-ink pt-5">
          <h2 className="m-0 text-nav" id="shared-projects-heading">
            {t.projects}
          </h2>
          <Label as="span">{messages.account.projectCount(active.length)}</Label>
        </div>
        {active.length === 0 ? (
          <p className="m-0 max-w-[48ch] py-8 text-body text-graphite">{t.noProjects}</p>
        ) : (
          <ul className="m-0 mt-2 list-none p-0">
            {active.map((project) => (
              <SharedProjectRow key={project.id} project={project} />
            ))}
          </ul>
        )}

        {archived.length > 0 && (
          <div className="mt-12">
            <div className="flex items-baseline gap-4 border-t border-hairline pt-4">
              <h3 className="m-0 text-nav">{t.archived}</h3>
              <Label as="span">{archived.length}</Label>
            </div>
            <p className="m-0 mt-2 max-w-[60ch] text-caption text-graphite">{t.archivedBody}</p>
            <ul className="m-0 mt-2 list-none p-0 opacity-70">
              {archived.map((project) => (
                <SharedProjectRow key={project.id} project={project} />
              ))}
            </ul>
          </div>
        )}
      </section>
    </motion.div>
  );
}
