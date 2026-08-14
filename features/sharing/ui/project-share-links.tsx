"use client";

import { useRef, useState } from "react";
import type { EditableSharedRevisionLink } from "@/features/projects/ui/project-editor-types";

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
  if (link.revokedAt) return "Widerrufen";
  if (new Date(link.expiresAt).getTime() <= Date.now()) return "Abgelaufen";
  return "Aktiv";
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
  const [links, setLinks] = useState(initialLinks);
  const [status, setStatus] = useState<ShareActionStatus>({ phase: "idle" });
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [revokeCandidateId, setRevokeCandidateId] = useState<string | null>(null);
  const operation = useRef<{ idempotencyKey: string; token: string } | null>(null);
  const isBusy = status.phase === "creating" || status.phase === "revoking";

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setStatus({ phase: "success", message: "Sicherer Link kopiert." });
    } catch {
      setStatus({
        phase: "error",
        message: "Automatisches Kopieren ist blockiert. Markieren Sie den Link im Feld.",
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
        error?: string;
      } | null;

      if (!response.ok || !payload?.link) {
        if (payload?.code === "token-conflict") operation.current = null;
        setStatus({
          phase: "error",
          message: payload?.error ?? "Der sichere Link konnte nicht erstellt werden.",
          requiresReload:
            response.status === 401 ||
            (response.status === 409 && payload?.code !== "token-conflict"),
          retry: { kind: "create" }
        });
        return;
      }

      const url = `${window.location.origin}/share/${payload.link.id}#${operation.current.token}`;
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
        message:
          "Die Verbindung wurde unterbrochen. Dieselbe Teilen-Anfrage kann erneut gesendet werden.",
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
        error?: string;
      } | null;
      if (!response.ok || !payload?.revokedAt) {
        setStatus({
          phase: "error",
          message: payload?.error ?? "Der Link konnte nicht widerrufen werden.",
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
      setStatus({ phase: "success", message: "Der Link wurde dauerhaft widerrufen." });
    } catch {
      setStatus({
        phase: "error",
        message: "Die Verbindung wurde beim Widerrufen unterbrochen.",
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
          <p className="text-body text-ink">Sicher teilen</p>
          <p className="mt-1 text-sm leading-6 text-graphite">
            Fixiert diesen Stand für 90 Tage.
          </p>
        </div>
        <button
          className="min-h-11 border border-ink px-4 text-body text-ink transition-colors hover:bg-ink hover:text-paper disabled:cursor-wait disabled:border-hairline disabled:text-ash disabled:hover:bg-transparent"
          disabled={!savedVersion || isBusy}
          onClick={() => void createLink()}
          type="button"
        >
          {status.phase === "creating" ? "Erstellt …" : "Link erstellen"}
        </button>
      </div>

      {!savedVersion && (
        <p className="mt-3 text-sm leading-6 text-graphite">
          Der Link kann erstellt werden, sobald der Arbeitsstand gespeichert ist.
        </p>
      )}

      {createdUrl && (
        <div className="mt-4 border-y border-ink py-4">
          <label className="text-sm text-graphite" htmlFor="created-share-url">
            Diesen Link jetzt sichern
          </label>
          <input
            className="mt-2 min-h-11 w-full border-0 border-b border-hairline bg-transparent px-0 text-sm text-ink outline-none focus:border-signature"
            id="created-share-url"
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            value={createdUrl}
          />
          <button
            className="mt-3 min-h-11 bg-ink px-4 text-body text-paper transition-colors hover:bg-signature"
            onClick={() => void copyUrl(createdUrl)}
            type="button"
          >
            Link kopieren
          </button>
          <p className="mt-3 text-sm leading-6 text-graphite">
            Der geheime Teil wird nicht gespeichert und kann später nicht erneut angezeigt werden.
          </p>
        </div>
      )}

      {links.length > 0 && (
        <details className="mt-4 border-y border-hairline">
          <summary className="cursor-pointer py-4 text-body text-graphite transition-colors hover:text-ink">
            {links.length === 1 ? "1 geteilter Stand" : `${links.length} geteilte Stände`}
          </summary>
          <ol className="divide-y divide-hairline border-t border-hairline">
            {links.map((link) => {
              const state = linkState(link);
              return (
                <li className="py-4" key={link.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-body text-ink">{state}</p>
                      <p className="mt-1 text-sm leading-6 text-graphite">
                        Bis {new Intl.DateTimeFormat("de-DE", {
                          dateStyle: "medium"
                        }).format(new Date(link.expiresAt))}
                      </p>
                    </div>
                    {state === "Aktiv" && (
                      <button
                        className="min-h-11 shrink-0 text-sm text-graphite underline decoration-hairline underline-offset-4 transition-colors hover:text-ink disabled:cursor-wait disabled:text-ash"
                        disabled={isBusy}
                        onClick={() => setRevokeCandidateId(link.id)}
                        type="button"
                      >
                        Widerrufen
                      </button>
                    )}
                  </div>

                  {revokeCandidateId === link.id && (
                    <div className="mt-4 border-t border-hairline pt-4">
                      <p className="text-sm leading-6 text-graphite">
                        Der Link funktioniert danach sofort und dauerhaft nicht mehr.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          className="min-h-11 bg-ink px-4 text-body text-paper transition-colors hover:bg-signature disabled:cursor-wait disabled:bg-graphite"
                          disabled={isBusy}
                          onClick={() => void revokeLink(link.id)}
                          type="button"
                        >
                          {status.phase === "revoking" && status.linkId === link.id
                            ? "Widerruft …"
                            : "Jetzt widerrufen"}
                        </button>
                        <button
                          className="min-h-11 border border-ink px-4 text-body text-ink transition-colors hover:bg-ink hover:text-paper disabled:cursor-wait disabled:text-ash"
                          disabled={isBusy}
                          onClick={() => setRevokeCandidateId(null)}
                          type="button"
                        >
                          Abbrechen
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

      <div aria-live="polite" className="mt-3 min-h-6 text-sm leading-6">
        {status.phase === "success" && <p className="text-graphite">{status.message}</p>}
        {status.phase === "error" && (
          <div className="text-signature">
            <p>{status.message}</p>
            <button
              className="mt-2 min-h-11 text-sm underline underline-offset-4"
              onClick={retryLastAction}
              type="button"
            >
              {status.requiresReload ? "Neu laden" : "Erneut versuchen"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
