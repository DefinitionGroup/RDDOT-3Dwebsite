"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { authClient } from "@/lib/auth-client";

type AccountProject = {
  id: string;
  name: string;
  lifecycle: "active" | "archived" | "trashed";
  updatedAt: string;
};

export function AccountWorkspace({
  expiresAt,
  projects
}: {
  expiresAt: string;
  projects: AccountProject[];
}) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

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
        <div className="flex items-baseline justify-between gap-6">
          <h2 className="text-lead">Projekte</h2>
          <span className="text-sm text-graphite">
            {projects.length === 1 ? "1 Projekt" : `${projects.length} Projekte`}
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="py-10">
            <p className="max-w-[40ch] text-body text-graphite">
              Noch ist hier alles offen. Starten Sie im Konfigurator; das
              Speichern als Projekt verbinden wir im nächsten Schritt.
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
              <li className="grid gap-1 py-5 sm:grid-cols-[1fr_auto] sm:items-end" key={project.id}>
                <div>
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
                <span className="text-sm text-graphite">Gespeichert</span>
              </li>
            ))}
          </ul>
        )}
      </section>

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
