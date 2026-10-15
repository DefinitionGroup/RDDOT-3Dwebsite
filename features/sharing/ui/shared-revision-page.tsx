"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/design-system/brand-logo";
import { Emphasized } from "@/components/design-system/emphasized";
import { Label } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import { ConfiguratorShell } from "@/features/configurator/ui/configurator-shell";
import type { ConfiguratorState } from "@/features/configurator/types";
import type { RevisionDisplaySnapshot } from "@/features/projects/revision-display";
import { localizePath } from "@/lib/i18n";
import { apiErrorMessage } from "@/lib/messages";
import { useLocale, useMessages } from "@/lib/messages/locale-context";

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
  const locale = useLocale();
  const messages = useMessages();
  const t = messages.sharedView;
  const [state, setState] = useState<SharedRevisionState>({ phase: "loading" });

  useEffect(() => {
    const token = window.location.hash.slice(1);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      const invalidTokenTimer = window.setTimeout(() => {
        setState({ phase: "error", message: t.brokenSecret });
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
        } | null;
        if (!response.ok || !payload?.configuration || !payload.expiresAt) {
          throw new Error(apiErrorMessage(messages, payload, t.gone));
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
          message: error instanceof Error ? error.message : t.gone
        });
      });

    return () => controller.abort();
  }, [linkId, messages, t]);

  if (state.phase === "ready") {
    return (
      <ConfiguratorShell
        initialState={state.configuration}
        locale={locale}
        sharedView={{
          displaySnapshot: state.displaySnapshot,
          expiresAt: state.expiresAt
        }}
      />
    );
  }

  return (
    <main className="min-h-svh bg-canvas px-5 py-6 text-ink md:px-12 md:py-8">
      <div className="mx-auto flex min-h-[calc(100svh-3rem)] max-w-[82rem] flex-col md:min-h-[calc(100svh-4rem)]">
        <BrandLogo href={localizePath(locale, "/")} label={messages.header.home} />
        <div aria-live="polite" className="my-auto max-w-[42rem] py-16">
          {state.phase === "loading" ? (
            <>
              <Label>{t.label}</Label>
              <h1 className="m-0 mt-5 text-heading">
                <Emphasized text={t.loadingTitle} />
              </h1>
              <div aria-hidden="true" className="mt-10 h-px overflow-hidden bg-hairline">
                <span className="block h-full w-1/3 animate-pulse bg-ink" />
              </div>
              <p className="m-0 mt-5 text-body text-graphite">{t.loadingBody}</p>
            </>
          ) : (
            <>
              <Label>{t.label}</Label>
              <h1 className="m-0 mt-5 text-heading">
                <Emphasized text={t.unavailableTitle} />
              </h1>
              <p className="m-0 mt-6 max-w-[52ch] text-body text-graphite">{state.message}</p>
              <Pill className="mt-8" href={localizePath(locale, "/configure")}>
                {messages.configurator.configureOwn}
              </Pill>
            </>
          )}
        </div>
        <p className="m-0 border-t border-hairline pt-5 text-caption text-graphite">
          {t.footer}
        </p>
      </div>
    </main>
  );
}
