"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState, type CSSProperties } from "react";
import { Emphasized } from "@/components/design-system/emphasized";
import { Label } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import type { AccountProject } from "@/features/customer-accounts/account-projects";
import { profileInitials, type CustomerProfile } from "@/features/customer-accounts/customer-profile";
import { AccountData } from "@/features/customer-accounts/ui/account-data";
import { ProfileForm } from "@/features/customer-accounts/ui/profile-form";
import {
  ProjectMenu,
  RestingProjectRow,
  useProjectActions,
  type ProjectActions
} from "@/features/customer-accounts/ui/project-actions";
import {
  galleryPageKey,
  type SerializedGalleryPage
} from "@/features/photo-gallery/serialize-gallery";
import { PhotoGallery } from "@/features/photo-gallery/ui/photo-gallery";
import type { SerializedQuoteRequestPage } from "@/features/quote-requests/serialize-quote-request";
import { QuoteRequestList } from "@/features/quote-requests/ui/quote-request-list";
import { authClient } from "@/lib/auth-client";
import { INTL_LOCALE, localizePath } from "@/lib/i18n";
import { apiErrorMessage } from "@/lib/messages";
import { useLocale, useMessages } from "@/lib/messages/locale-context";
import { DURATION, REVEAL_RISE, SIGNATURE_EASE } from "@/lib/motion";

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3 transition-transform duration-state ease-signature group-hover:translate-x-0.5"
      fill="none"
      viewBox="0 0 12 12"
    >
      <path d="M2 6h8m0 0L6 2m4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
    </svg>
  );
}

function finishFill(finish: { hex: string; textureUrl: string | null }): CSSProperties {
  return finish.textureUrl
    ? { backgroundColor: finish.hex, backgroundImage: `url(${finish.textureUrl})`, backgroundSize: "180px" }
    : { backgroundColor: finish.hex };
}

/**
 * The kitchen in its materials: four fronts in the front finish, framed by
 * the carcass finish showing through the joints and as the plinth.
 */
function MaterialPlate({ summary }: { summary: NonNullable<AccountProject["summary"]> }) {
  return (
    <span
      aria-hidden="true"
      className="relative block aspect-[16/9] w-full overflow-hidden"
      style={{ backgroundColor: summary.cabinet.hex }}
    >
      <span className="absolute inset-x-[7%] bottom-[16%] top-[12%] grid grid-cols-4 gap-[3px]">
        {[0, 1, 2, 3].map((panel) => (
          <span className="block" key={panel} style={finishFill(summary.front)} />
        ))}
      </span>
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255/0.08)_0%,rgb(0_0_0/0)_45%,rgb(0_0_0/0.28)_100%)]" />
    </span>
  );
}

function formatDay(iso: string, locale: keyof typeof INTL_LOCALE) {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(iso));
}

function ProjectCard({ actions, project }: { actions: ProjectActions; project: AccountProject }) {
  const locale = useLocale();
  const t = useMessages().account;
  const updated = formatDay(project.updatedAt, locale);

  return (
    <div className="relative h-full">
      <Link
        className="group flex h-full flex-col overflow-hidden rounded-card bg-charcoal transition-colors duration-state ease-signature hover:bg-[#262626]"
        href={localizePath(locale, `/configure?project=${project.id}`)}
      >
        {project.summary ? <MaterialPlate summary={project.summary} /> : <span className="block aspect-[16/9] bg-mist" />}
        <span className="flex flex-1 flex-col p-5">
          <span className="block truncate text-card">{project.name}</span>
          {project.summary && (
            <>
              <span className="mt-1 block text-caption text-graphite">{project.summary.layout}</span>
              <span className="block text-caption text-graphite">
                {t.finishes(project.summary.cabinet.label, project.summary.front.label)}
              </span>
            </>
          )}
          <span className="mt-auto flex items-end justify-between gap-4 pt-5">
            <span className="min-w-0">
              {project.summary && (
                <span className="tnum block font-display text-[1.25rem] leading-none tracking-[-0.02em]">
                  {project.summary.price}
                </span>
              )}
              <span className="mt-1.5 block text-caption text-ash">{t.lastChanged(updated)}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-2 text-nav text-graphite transition-colors duration-state ease-signature group-hover:text-ink">
              {t.open}
              <ArrowIcon />
            </span>
          </span>
        </span>
      </Link>
      <ProjectMenu actions={actions} project={project} />
    </div>
  );
}

export function AccountWorkspace({
  email,
  expiresAt,
  gallery,
  pendingImport,
  profile: initialProfile,
  projects,
  quoteRequests
}: {
  email: string;
  expiresAt: string;
  gallery: SerializedGalleryPage;
  pendingImport: {
    configurationCode: string;
    idempotencyKey: string;
  } | null;
  profile: CustomerProfile;
  projects: AccountProject[];
  quoteRequests: SerializedQuoteRequestPage;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const t = messages.account;
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [profile, setProfile] = useState(initialProfile);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importAttempt, setImportAttempt] = useState(0);
  const actions = useProjectActions();
  const active = projects.filter((project) => project.lifecycle === "active");
  const archived = projects.filter((project) => project.lifecycle === "archived");
  const trashed = projects.filter((project) => project.lifecycle === "trashed");

  useEffect(() => {
    if (!pendingImport) return;

    const abortController = new AbortController();

    async function importProject() {
      setImportError(null);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // A guest configuration arrives unnamed; it takes the page language's default.
        body: JSON.stringify({ ...pendingImport, name: messages.photo.defaultProjectName }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const result: unknown = await response.json().catch(() => null);
        setImportError(apiErrorMessage(messages, result, t.importFailed));
        return;
      }

      startTransition(() => router.replace(localizePath(locale, "/konto")));
    }

    void importProject().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setImportError(t.importFailed);
    });

    return () => abortController.abort();
  }, [importAttempt, locale, messages, pendingImport, router, t]);

  async function signOut() {
    setIsSigningOut(true);
    await authClient.signOut();
    startTransition(() => router.refresh());
  }

  const sections = [
    { id: "projects", label: t.projects, count: active.length },
    { id: "requests", label: messages.requestList.heading, count: quoteRequests.totalCount },
    { id: "photos", label: messages.gallery.heading, count: gallery.totalCount },
    { id: "profile", label: t.profile, count: null },
    { id: "data", label: t.dataSection, count: null }
  ];

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: REVEAL_RISE }}
      transition={{ duration: DURATION.reveal, ease: SIGNATURE_EASE }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-center gap-5">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-pill border border-hairline bg-charcoal font-display text-[1.25rem] tracking-[-0.02em] text-ink"
          >
            {profileInitials(profile.name, email)}
          </span>
          <div className="min-w-0">
            <h1 className="m-0 text-heading">
              <Emphasized text={t.title} />
            </h1>
            <p className="m-0 mt-2 truncate text-body text-graphite">
              {profile.name ? `${profile.name} · ${email}` : t.signedInAs(email)}
            </p>
          </div>
        </div>
        <Pill className="-mr-5" disabled={isSigningOut} onClick={signOut} variant="ghost">
          {isSigningOut ? t.signingOut : t.signOut}
        </Pill>
      </div>

      {pendingImport && (
        <div aria-live="polite" className="mt-10 rounded-card border border-hairline p-4">
          {importError ? (
            <>
              <p className="m-0 text-caption text-ink">{importError}</p>
              <Pill className="mt-4 h-11" onClick={() => setImportAttempt((attempt) => attempt + 1)}>
                {t.saveAgain}
              </Pill>
            </>
          ) : (
            <div className="flex items-center gap-3 text-caption text-graphite">
              <motion.span
                animate={{ rotate: prefersReducedMotion ? 0 : 360 }}
                aria-hidden="true"
                className="size-3 rounded-pill border border-graphite border-t-transparent"
                transition={{ duration: 0.8, ease: "linear", repeat: prefersReducedMotion ? 0 : Infinity }}
              />
              {t.importing}
            </div>
          )}
        </div>
      )}

      {/* One column as wide as the screen on phones, so the section row scrolls instead of widening it. */}
      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:mt-16 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label={t.sectionsLabel} className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <ul className="-mx-5 m-0 flex list-none gap-1 overflow-x-auto px-5 lg:mx-0 lg:flex-col lg:px-0">
            {sections.map((section) => (
              <li className="shrink-0" key={section.id}>
                <a
                  className="flex min-h-11 items-center justify-between gap-4 rounded-pill px-4 text-nav text-graphite transition-colors duration-state ease-signature hover:bg-ink/[.06] hover:text-ink lg:-mx-4"
                  href={`#${section.id}`}
                >
                  {section.label}
                  {section.count !== null && (
                    <span className="tnum text-caption text-ash">{section.count}</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid min-w-0 gap-16">
          <section aria-labelledby="projects-heading" className="scroll-mt-8" id="projects">
            <div className="flex items-center justify-between gap-6 border-t border-ink pt-5">
              <div className="flex items-baseline gap-4">
                <h2 className="m-0 text-nav" id="projects-heading">
                  {t.projects}
                </h2>
                <Label as="span">{t.projectCount(active.length)}</Label>
              </div>
              {active.length > 0 && (
                <Pill href={localizePath(locale, "/configure")}>{t.newProject}</Pill>
              )}
            </div>
            <p aria-live="polite" className="m-0 text-caption text-ink empty:hidden">
              {actions.error}
            </p>
            {active.length === 0 ? (
              <div className="py-8">
                <p className="m-0 max-w-[40ch] text-body text-graphite">{t.noProjects}</p>
                <Pill className="mt-7" href={localizePath(locale, "/configure")}>
                  {t.configure}
                </Pill>
              </div>
            ) : (
              <ul className="m-0 mt-6 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
                {active.map((project) => (
                  <li key={project.id}>
                    <ProjectCard actions={actions} project={project} />
                  </li>
                ))}
              </ul>
            )}

            {archived.length > 0 && (
              <div className="mt-12 scroll-mt-8" id="archive">
                <div className="flex items-baseline gap-4 border-t border-hairline pt-4">
                  <h3 className="m-0 text-nav">{t.archived}</h3>
                  <Label as="span">{archived.length}</Label>
                </div>
                <p className="m-0 mt-2 max-w-[60ch] text-caption text-graphite">{t.archivedBody}</p>
                <ul className="m-0 mt-3 list-none p-0">
                  {archived.map((project) => (
                    <RestingProjectRow
                      actions={actions}
                      detail={t.lastChanged(formatDay(project.updatedAt, locale))}
                      key={project.id}
                      project={project}
                    />
                  ))}
                </ul>
              </div>
            )}

            {trashed.length > 0 && (
              <div className="mt-12 scroll-mt-8" id="trash">
                <div className="flex items-baseline gap-4 border-t border-hairline pt-4">
                  <h3 className="m-0 text-nav">{t.trash}</h3>
                  <Label as="span">{trashed.length}</Label>
                </div>
                <p className="m-0 mt-2 max-w-[60ch] text-caption text-graphite">{t.trashBody}</p>
                <ul className="m-0 mt-3 list-none p-0">
                  {trashed.map((project) => (
                    <RestingProjectRow
                      actions={actions}
                      detail={t.inTrashSince(formatDay(project.trashedAt ?? project.updatedAt, locale))}
                      key={project.id}
                      project={project}
                    />
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="scroll-mt-8" id="requests">
            <QuoteRequestList page={quoteRequests} />
          </section>

          <section className="scroll-mt-8" id="photos">
            <PhotoGallery
              emptyMessage={messages.gallery.accountEmpty}
              initialNextCursor={gallery.nextCursor}
              initialPhotos={gallery.photos}
              initialTotalCount={gallery.totalCount}
              key={galleryPageKey("account", gallery)}
              scope={{ kind: "account" }}
            />
          </section>

          <section aria-labelledby="profile-heading" className="scroll-mt-8" id="profile">
            <div className="border-t border-ink pt-5">
              <h2 className="m-0 text-nav" id="profile-heading">
                {t.profile}
              </h2>
            </div>
            <div className="mt-6">
              <ProfileForm email={email} initial={profile} onSaved={setProfile} />
            </div>
          </section>

          <section aria-labelledby="data-heading" className="scroll-mt-8" id="data">
            <div className="border-t border-ink pt-5">
              <h2 className="m-0 text-nav" id="data-heading">
                {t.dataSection}
              </h2>
            </div>
            <div className="mt-6">
              <AccountData hasRequests={quoteRequests.totalCount > 0} />
            </div>
          </section>

          <p className="m-0 text-caption text-ash">
            {t.sessionUntil(
              new Intl.DateTimeFormat(INTL_LOCALE[locale], {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              }).format(new Date(expiresAt))
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
