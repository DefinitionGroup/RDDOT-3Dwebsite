"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  galleryPageKey,
  type SerializedGalleryPage
} from "@/features/photo-gallery/serialize-gallery";
import { PhotoGallery } from "@/features/photo-gallery/ui/photo-gallery";
import { authClient } from "@/lib/auth-client";

type AccountProject = {
  id: string;
  name: string;
  lifecycle: "active" | "archived" | "trashed";
  updatedAt: string;
};

export function AccountWorkspace({
  expiresAt,
  gallery,
  pendingImport,
  projects
}: {
  expiresAt: string;
  gallery: SerializedGalleryPage;
  pendingImport: {
    configurationCode: string;
    idempotencyKey: string;
  } | null;
  projects: AccountProject[];
}) {
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
        body: JSON.stringify(pendingImport),
        signal: abortController.signal
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setImportError(
          result?.error ??
            "Das Projekt konnte nicht gespeichert werden. Bitte versuchen Sie es erneut."
        );
        return;
      }

      startTransition(() => router.replace("/konto"));
    }

    void importProject().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setImportError(
        "Das Projekt konnte nicht gespeichert werden. Bitte versuchen Sie es erneut."
      );
    });

    return () => abortController.abort();
  }, [importAttempt, pendingImport, router]);

  async function signOut() {
    setIsSigningOut(true);
    await authClient.signOut();
    startTransition(() => router.refresh());
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[37rem]"
      initial={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[clamp(2.65rem,6vw,4.8rem)] font-[200] leading-[0.96] tracking-[-0.03em]">
            Mein Bereich.
          </h1>
          <p className="mt-5 max-w-[42ch] text-body text-graphite">
            Ihre Projekte, Versionen und späteren Anfragen bleiben hier privat
            zusammen.
          </p>
        </div>
        <button
          className="shrink-0 text-sm text-graphite underline decoration-hairline underline-offset-4 transition-colors hover:text-ink disabled:cursor-wait"
          disabled={isSigningOut}
          onClick={signOut}
          type="button"
        >
          {isSigningOut ? "Abmeldung …" : "Abmelden"}
        </button>
      </div>

      <section className="mt-12 border-t border-ink pt-5">
        {pendingImport && (
          <div
            aria-live="polite"
            className="mb-8 border-b border-hairline pb-6"
          >
            {importError ? (
              <>
                <p className="text-body text-signature">{importError}</p>
                <button
                  className="mt-4 min-h-11 bg-ink px-5 text-body text-paper transition-colors hover:bg-signature"
                  onClick={() => setImportAttempt((attempt) => attempt + 1)}
                  type="button"
                >
                  Erneut speichern
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3 text-body text-graphite">
                <motion.span
                  animate={{ rotate: prefersReducedMotion ? 0 : 360 }}
                  aria-hidden="true"
                  className="size-3 border border-graphite border-t-transparent"
                  transition={{
                    duration: 0.8,
                    ease: "linear",
                    repeat: prefersReducedMotion ? 0 : Infinity
                  }}
                />
                Konfiguration wird als privates Projekt gespeichert …
              </div>
            )}
          </div>
        )}

        <div className="flex items-baseline justify-between gap-6">
          <h2 className="text-lead">Projekte</h2>
          <span className="text-sm text-graphite">
            {projects.length === 1 ? "1 Projekt" : `${projects.length} Projekte`}
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="py-10">
            <p className="max-w-[40ch] text-body text-graphite">
              Noch ist hier alles offen. Starten Sie im Konfigurator und
              speichern Sie Ihren Entwurf als privates Projekt.
            </p>
            <Link
              className="mt-7 inline-flex min-h-12 items-center bg-signature px-6 text-body text-paper transition-colors duration-300 hover:bg-ink"
              href="/configure"
            >
              Küche konfigurieren
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-hairline border-b border-hairline">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  className="group grid min-w-0 gap-2 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signature focus-visible:ring-offset-4 focus-visible:ring-offset-canvas sm:grid-cols-[1fr_auto] sm:items-end"
                  href={`/configure?project=${project.id}`}
                >
                  <div className="min-w-0">
                  <p className="text-lead">{project.name}</p>
                  <p className="mt-1 text-sm text-graphite">
                    Zuletzt geändert am{" "}
                    {new Intl.DateTimeFormat("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric"
                    }).format(new Date(project.updatedAt))}
                  </p>
                  </div>
                  <span className="text-sm text-graphite transition-colors group-hover:text-ink">
                    Projekt öffnen →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-12">
        <PhotoGallery
          emptyMessage="Noch keine Visualisierung. Ansichten, die Sie im Konfigurator erzeugen, sammeln sich hier über alle Projekte hinweg."
          initialNextCursor={gallery.nextCursor}
          initialPhotos={gallery.photos}
          initialTotalCount={gallery.totalCount}
          key={galleryPageKey("account", gallery)}
          scope={{ kind: "account" }}
        />
      </div>

      <p className="mt-8 text-xs leading-5 text-graphite">
        Sitzung geschützt bis {new Intl.DateTimeFormat("de-DE", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        }).format(new Date(expiresAt))} Uhr.
      </p>
    </motion.div>
  );
}
