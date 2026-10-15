"use client";

import { useRef, useState } from "react";
import type { EditableSharedRevisionLink } from "@/features/projects/ui/project-editor-types";
import { INTL_LOCALE, localizePath } from "@/lib/i18n";
import { apiErrorMessage } from "@/lib/messages";
import { useLocale, useMessages } from "@/lib/messages/locale-context";

type ShareActionStatus =
  | { phase: "idle" }
  | { phase: "creating" }
  | { phase: "revoking"; linkId: string }
  | { phase: "success"; message: string }
  | {
      phase: "error";
      message: string;
      requiresReload?: boolean;
      retry:
        | { kind: "create" }
        | { kind: "copy"; url: string }
        | { kind: "revoke"; linkId: string };
    };

function createSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function linkState(link: EditableSharedRevisionLink) {
  if (link.revokedAt) return "revoked";
  if (new Date(link.expiresAt).getTime() <= Date.now()) return "expired";
  return "active";
}

export function ProjectShareLinks({
  initialLinks,
  projectId,
  savedVersion
}: {
  initialLinks: EditableSharedRevisionLink[];
  projectId: string;
  savedVersion: number | null;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const t = messages.shareLinks;
  const [links, setLinks] = useState(initialLinks);
  const [status, setStatus] = useState<ShareActionStatus>({ phase: "idle" });
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [revokeCandidateId, setRevokeCandidateId] = useState<string | null>(null);
  const operation = useRef<{ idempotencyKey: string; token: string } | null>(null);
  const isBusy = status.phase === "creating" || status.phase === "revoking";

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setStatus({ phase: "success", message: t.copied });
    } catch {
      setStatus({
        phase: "error",
        message: t.copyBlocked,
        retry: { kind: "copy", url }
      });
    }
  }

  async function createLink() {
    if (!savedVersion || isBusy) return;
    operation.current ??= {
      idempotencyKey: crypto.randomUUID(),
      token: createSecret()
    };
    setStatus({ phase: "creating" });
    setCreatedUrl(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/share-links`, {
        body: JSON.stringify({
          expectedVersion: savedVersion,
          idempotencyKey: operation.current.idempotencyKey,
          token: operation.current.token
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = (await response.json().catch(() => null)) as {
        link?: EditableSharedRevisionLink;
        created?: boolean;
        code?: string;
      } | null;

      if (!response.ok || !payload?.link) {
        if (payload?.code === "token-conflict") operation.current = null;
        setStatus({
          phase: "error",
          message: apiErrorMessage(messages, payload, t.createFailed),
          requiresReload:
            response.status === 401 ||
            (response.status === 409 && payload?.code !== "token-conflict"),
          retry: { kind: "create" }
        });
        return;
      }

      const url = `${window.location.origin}${localizePath(locale, `/share/${payload.link.id}`)}#${operation.current.token}`;
      setLinks((current) => [
        payload.link!,
        ...current.filter((link) => link.id !== payload.link!.id)
      ]);
      setCreatedUrl(url);
      operation.current = null;
      await copyUrl(url);
    } catch {
      setStatus({
        phase: "error",
        message: t.createOffline,
        retry: { kind: "create" }
      });
    }
  }

  async function revokeLink(linkId: string) {
    if (isBusy) return;
    setStatus({ phase: "revoking", linkId });

    try {
      const response = await fetch(
        `/api/projects/${projectId}/share-links/${linkId}`,
        { method: "DELETE" }
      );
      const payload = (await response.json().catch(() => null)) as {
        revokedAt?: string;
      } | null;
      if (!response.ok || !payload?.revokedAt) {
        setStatus({
          phase: "error",
          message: apiErrorMessage(messages, payload, t.revokeFailed),
          requiresReload: response.status === 401,
          retry: { kind: "revoke", linkId }
        });
        return;
      }

      setLinks((current) =>
        current.map((link) =>
          link.id === linkId ? { ...link, revokedAt: payload.revokedAt! } : link
        )
      );
      setRevokeCandidateId(null);
      setCreatedUrl(null);
      setStatus({ phase: "success", message: t.revokedDone });
    } catch {
      setStatus({
        phase: "error",
        message: t.revokeOffline,
        retry: { kind: "revoke", linkId }
      });
    }
  }

  function retryLastAction() {
    if (status.phase !== "error") return;
    if (status.requiresReload) {
      window.location.reload();
      return;
    }
    if (status.retry.kind === "create") {
      void createLink();
      return;
    }
    if (status.retry.kind === "copy") {
      void copyUrl(status.retry.url);
      return;
    }
    void revokeLink(status.retry.linkId);
  }

  return (
    <section className="border-t border-hairline pt-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="m-0 text-nav">{t.heading}</p>
          <p className="m-0 mt-1 text-caption text-graphite">{t.note}</p>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center rounded-pill border border-ink px-5 text-nav font-label leading-none text-ink transition-colors duration-state ease-signature hover:bg-ink/10 disabled:cursor-wait disabled:border-hairline disabled:text-ash disabled:hover:bg-transparent"
          disabled={!savedVersion || isBusy}
          onClick={() => void createLink()}
          type="button"
        >
          {status.phase === "creating" ? t.creating : t.create}
        </button>
      </div>

      {!savedVersion && (
        <p className="m-0 mt-3 text-caption text-graphite">{t.waitForAutosave}</p>
      )}

      {createdUrl && (
        <div className="mt-4 rounded-card border border-hairline p-4">
          <label className="text-caption text-graphite" htmlFor="created-share-url">
            {t.keepNow}
          </label>
          <input
            className="mt-2 min-h-11 w-full border-0 border-b border-hairline bg-transparent px-0 text-caption text-ink outline-none focus:border-ink"
            id="created-share-url"
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            value={createdUrl}
          />
          <button
            className="mt-3 inline-flex h-11 items-center justify-center rounded-pill bg-signature px-5 text-nav font-label leading-none text-ink transition-colors duration-state ease-signature hover:bg-signature-hover disabled:cursor-wait disabled:opacity-40"
            onClick={() => void copyUrl(createdUrl)}
            type="button"
          >
            {t.copy}
          </button>
          <p className="m-0 mt-3 text-caption text-graphite">{t.secretNote}</p>
        </div>
      )}

      {links.length > 0 && (
        <details className="mt-4 border-y border-hairline">
          <summary className="cursor-pointer py-4 text-caption text-graphite transition-colors duration-state ease-signature hover:text-ink">
            {t.count(links.length)}
          </summary>
          <ol className="divide-y divide-hairline border-t border-hairline">
            {links.map((link) => {
              const state = linkState(link);
              return (
                <li className="py-4" key={link.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="m-0 text-caption text-ink">{t[state]}</p>
                      <p className="m-0 mt-1 text-caption text-graphite">
                        {t.until(
                          new Intl.DateTimeFormat(INTL_LOCALE[locale], {
                            dateStyle: "medium"
                          }).format(new Date(link.expiresAt))
                        )}
                      </p>
                    </div>
                    {state === "active" && (
                      <button
                        className="shrink-0 inline-flex min-h-11 items-center text-caption text-graphite underline decoration-hairline underline-offset-4 transition-colors duration-state ease-signature hover:text-porcelain disabled:cursor-wait disabled:text-ash"
                        disabled={isBusy}
                        onClick={() => setRevokeCandidateId(link.id)}
                        type="button"
                      >
                        {t.revoke}
                      </button>
                    )}
                  </div>

                  {revokeCandidateId === link.id && (
                    <div className="mt-4 border-t border-hairline pt-4">
                      <p className="m-0 text-caption text-graphite">{t.revokeNote}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="inline-flex h-11 items-center justify-center rounded-pill bg-signature px-5 text-nav font-label leading-none text-ink transition-colors duration-state ease-signature hover:bg-signature-hover disabled:cursor-wait disabled:opacity-40"
                          disabled={isBusy}
                          onClick={() => void revokeLink(link.id)}
                          type="button"
                        >
                          {status.phase === "revoking" && status.linkId === link.id
                            ? t.revoking
                            : t.revokeNow}
                        </button>
                        <button
                          className="inline-flex h-11 items-center justify-center rounded-pill border border-ink px-5 text-nav font-label leading-none text-ink transition-colors duration-state ease-signature hover:bg-ink/10 disabled:cursor-wait disabled:border-hairline disabled:text-ash disabled:hover:bg-transparent"
                          disabled={isBusy}
                          onClick={() => setRevokeCandidateId(null)}
                          type="button"
                        >
                          {messages.common.cancel}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </details>
      )}

      <div aria-live="polite" className="mt-3 min-h-6 text-caption">
        {status.phase === "success" && <p className="m-0 text-graphite">{status.message}</p>}
        {status.phase === "error" && (
          <div className="text-ink">
            <p className="m-0">{status.message}</p>
            <button
              className="mt-2 inline-flex min-h-11 items-center text-caption underline underline-offset-4"
              onClick={retryLastAction}
              type="button"
            >
              {status.requiresReload ? messages.common.reload : messages.common.retry}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
