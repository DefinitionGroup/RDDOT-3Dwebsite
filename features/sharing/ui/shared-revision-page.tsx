"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/design-system/brand-logo";
import { ConfiguratorShell } from "@/features/configurator/ui/configurator-shell";
import type { ConfiguratorState } from "@/features/configurator/types";
import type { RevisionDisplaySnapshot } from "@/features/projects/revision-display";

type SharedRevisionState =
  | { phase: "loading" }
  | {
      phase: "ready";
      configuration: ConfiguratorState;
      displaySnapshot: RevisionDisplaySnapshot | null;
      expiresAt: string;
    }
  | { phase: "error"; message: string };

export function SharedRevisionPage({ linkId }: { linkId: string }) {
  const [state, setState] = useState<SharedRevisionState>({ phase: "loading" });

  useEffect(() => {
    const token = window.location.hash.slice(1);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      const invalidTokenTimer = window.setTimeout(() => {
        setState({
          phase: "error",
          message: "Der sichere Teil dieses Links fehlt oder ist beschädigt."
        });
      }, 0);
      return () => window.clearTimeout(invalidTokenTimer);
    }

    const controller = new AbortController();
    void fetch(`/api/shared-revisions/${linkId}/resolve`, {
      body: JSON.stringify({ token }),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          configuration?: ConfiguratorState;
          displaySnapshot?: RevisionDisplaySnapshot | null;
          expiresAt?: string;
          error?: string;
        } | null;
        if (!response.ok || !payload?.configuration || !payload.expiresAt) {
          throw new Error(
            payload?.error ?? "Dieser geteilte Stand ist nicht mehr verfügbar."
          );
        }
        setState({
          phase: "ready",
          configuration: payload.configuration,
          displaySnapshot: payload.displaySnapshot ?? null,
          expiresAt: payload.expiresAt
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState({
          phase: "error",
          message:
            error instanceof Error
              ? error.message
              : "Dieser geteilte Stand ist nicht mehr verfügbar."
        });
      });

    return () => controller.abort();
  }, [linkId]);

  if (state.phase === "ready") {
    return (
      <ConfiguratorShell
        initialState={state.configuration}
        locale="de"
        sharedView={{
          displaySnapshot: state.displaySnapshot,
          expiresAt: state.expiresAt
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-canvas px-5 py-6 text-ink md:px-12 md:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[82rem] flex-col md:min-h-[calc(100vh-5rem)]">
        <BrandLogo href="/" tone="dark" />
        <div aria-live="polite" className="my-auto max-w-[42rem] py-16">
          {state.phase === "loading" ? (
            <>
              <h1 className="text-[clamp(2.75rem,7vw,6rem)] font-[200] leading-none tracking-[-0.03em]">
                Geteilter Küchenstand<span className="text-signature">.</span>
              </h1>
              <div className="mt-10 h-px overflow-hidden bg-hairline" aria-hidden="true">
                <span className="block h-full w-1/3 animate-pulse bg-signature" />
              </div>
              <p className="mt-5 text-body text-graphite">
                Der unveränderliche Stand wird sicher geladen.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[clamp(2.75rem,7vw,6rem)] font-[200] leading-none tracking-[-0.03em]">
                Link nicht verfügbar<span className="text-signature">.</span>
              </h1>
              <p className="mt-6 max-w-[52ch] text-body text-graphite">
                {state.message}
              </p>
              <Link
                className="mt-8 inline-flex min-h-12 items-center justify-center bg-ink px-6 text-body text-paper transition-colors hover:bg-signature"
                href="/configure"
              >
                Eigene Küche konfigurieren
              </Link>
            </>
          )}
        </div>
        <p className="border-t border-hairline pt-5 text-sm text-graphite">
          rotpunkt Signature · Geteilte Ansicht ohne Projektdaten
        </p>
      </div>
    </main>
  );
}
