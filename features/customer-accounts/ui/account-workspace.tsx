"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { Emphasized } from "@/components/design-system/emphasized";
import { Label } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
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

type AccountProject = {
  id: string;
  name: string;
  lifecycle: "active" | "archived" | "trashed";
  updatedAt: string;
};

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

export function AccountWorkspace({
  expiresAt,
  gallery,
  pendingImport,
  projects,
  quoteRequests
}: {
  expiresAt: string;
  gallery: SerializedGalleryPage;
  pendingImport: {
    configurationCode: string;
    idempotencyKey: string;
  } | null;
  projects: AccountProject[];
  quoteRequests: SerializedQuoteRequestPage;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const t = messages.account;
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importAttempt, setImportAttempt] = useState(0);

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

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[37rem]"
      initial={{ opacity: 0, y: REVEAL_RISE }}
      transition={{ duration: DURATION.reveal, ease: SIGNATURE_EASE }}
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="m-0 text-heading">
            <Emphasized text={t.title} />
          </h1>
          <p className="m-0 mt-5 max-w-[42ch] text-body text-graphite">{t.body}</p>
        </div>
        <Pill className="-mr-5 shrink-0" disabled={isSigningOut} onClick={signOut} variant="ghost">
          {isSigningOut ? t.signingOut : t.signOut}
        </Pill>
      </div>

      <section className="mt-12">
        {pendingImport && (
          <div aria-live="polite" className="mb-6 rounded-card border border-hairline p-4">
            {importError ? (
              <>
                <p className="m-0 text-caption text-ink">{importError}</p>
                <Pill
                  className="mt-4 h-11"
                  onClick={() => setImportAttempt((attempt) => attempt + 1)}
                >
                  {t.saveAgain}
                </Pill>
              </>
            ) : (
              <div className="flex items-center gap-3 text-caption text-graphite">
                <motion.span
                  animate={{ rotate: prefersReducedMotion ? 0 : 360 }}
                  aria-hidden="true"
                  className="size-3 rounded-pill border border-graphite border-t-transparent"
                  transition={{
                    duration: 0.8,
                    ease: "linear",
                    repeat: prefersReducedMotion ? 0 : Infinity
                  }}
                />
                {t.importing}
              </div>
            )}
          </div>
        )}

        <div className="flex items-baseline justify-between gap-6 border-t border-ink pt-5">
          <h2 className="m-0 text-nav">{t.projects}</h2>
          <Label as="span">{t.projectCount(projects.length)}</Label>
        </div>

        {projects.length === 0 ? (
          <div className="py-8">
            <p className="m-0 max-w-[40ch] text-body text-graphite">{t.noProjects}</p>
            <Pill className="mt-7" href={localizePath(locale, "/configure")}>
              {t.configure}
            </Pill>
          </div>
        ) : (
          <ul className="m-0 mt-4 grid list-none gap-3 p-0">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  className="group flex min-w-0 items-end justify-between gap-4 rounded-card bg-charcoal p-5 transition-colors duration-state ease-signature hover:bg-[#262626]"
                  href={localizePath(locale, `/configure?project=${project.id}`)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-card">{project.name}</span>
                    <span className="mt-1 block text-caption text-graphite">
                      {t.lastChanged(
                        new Intl.DateTimeFormat(INTL_LOCALE[locale], {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric"
                        }).format(new Date(project.updatedAt))
                      )}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-2 text-nav text-graphite transition-colors duration-state ease-signature group-hover:text-ink">
                    {t.open}
                    <ArrowIcon />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-12">
        <QuoteRequestList page={quoteRequests} />
      </div>

      <div className="mt-12">
        <PhotoGallery
          emptyMessage={messages.gallery.accountEmpty}
          initialNextCursor={gallery.nextCursor}
          initialPhotos={gallery.photos}
          initialTotalCount={gallery.totalCount}
          key={galleryPageKey("account", gallery)}
          scope={{ kind: "account" }}
        />
      </div>

      <p className="m-0 mt-8 text-caption text-ash">
        {t.sessionUntil(
          new Intl.DateTimeFormat(INTL_LOCALE[locale], {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
          }).format(new Date(expiresAt))
        )}
      </p>
    </motion.div>
  );
}
