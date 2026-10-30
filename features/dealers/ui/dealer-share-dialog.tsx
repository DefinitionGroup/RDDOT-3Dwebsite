"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Emphasized } from "@/components/design-system/emphasized";
import { FieldLabel, TextField } from "@/components/design-system/field";
import { Overlay } from "@/components/design-system/overlay";
import { Pill } from "@/components/design-system/pill";
import type { GeoPoint } from "@/features/dealers/dealer-distance";
import { apiErrorMessage } from "@/lib/messages";
import { useMessages } from "@/lib/messages/locale-context";

// MapLibre and its stylesheet load only once someone opens this dialog.
const DealerMap = dynamic(() => import("@/features/dealers/ui/dealer-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-soot" />
});

type DirectoryDealer = GeoPoint & {
  id: string;
  name: string;
  street: string;
  postalCode: string;
  city: string;
  distanceKm: number | null;
};

type Directory = { postcode: string; origin: GeoPoint | null; dealers: DirectoryDealer[] };

/** What the dealer will see of the customer: the copy the server makes from the profile. */
export type SharedContactPreview = { name: string; email: string; phone: string };

/**
 * Choosing the Dealer to share a Project with (ADR 0014): the directory on a
 * map and as a list, nearest first, and exactly what the dealer will see
 * before anything is shared. One filled action.
 */
export function DealerShareDialog({
  contact,
  currentDealerId,
  onClose,
  onShared,
  open,
  project
}: {
  contact: SharedContactPreview;
  currentDealerId: string | null;
  onClose: () => void;
  onShared: (dealerName: string) => void;
  open: boolean;
  project: { id: string; name: string };
}) {
  const messages = useMessages();
  const t = messages.dealers;
  const searchId = useId();
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(currentDealerId);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const postcodeAsked = /^\d{5}$/.test(query.trim()) ? query.trim() : "";

  // A full postcode in the search box re-sorts from there; anything else filters.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/dealers${postcodeAsked ? `?postcode=${postcodeAsked}` : ""}`, {
          signal: controller.signal
        });
        if (!response.ok) throw new Error(String(response.status));
        const next = (await response.json()) as Directory;
        setLoadError(false);
        setDirectory(next);
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setLoadError(true);
      }
    }

    void load();
    return () => controller.abort();
  }, [open, postcodeAsked]);

  const shown = useMemo(() => {
    const dealers = directory?.dealers ?? [];
    const needle = query.trim().toLocaleLowerCase("de");
    if (!needle || postcodeAsked) return dealers;
    return dealers.filter((dealer) =>
      [dealer.name, dealer.city, dealer.postalCode].some((value) =>
        value.toLocaleLowerCase("de").includes(needle)
      )
    );
  }, [directory, postcodeAsked, query]);

  const selected = directory?.dealers.find((dealer) => dealer.id === selectedId) ?? null;
  const unchanged = selected?.id === currentDealerId;

  function choose(dealerId: string) {
    setSelectedId(dealerId);
    setError(null);
    idempotencyKey.current = null;
  }

  async function share() {
    if (!selected || unchanged) return;
    setSharing(true);
    setError(null);
    idempotencyKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch(`/api/projects/${project.id}/dealer-grant`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealerId: selected.id, idempotencyKey: idempotencyKey.current })
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        setError(apiErrorMessage(messages, payload, t.failed));
        return;
      }
      onShared(selected.name);
    } catch {
      setError(messages.common.connectionLostRetry);
    } finally {
      setSharing(false);
    }
  }

  return (
    <Overlay
      footer={
        <>
          <p aria-live="polite" className="m-0 min-w-0 text-caption text-graphite">
            {error ?? t.disclosureNote}
          </p>
          <Pill disabled={!selected || unchanged || sharing} onClick={() => void share()}>
            {sharing ? t.sharing : selected && !unchanged ? t.share(selected.name) : t.choose}
          </Pill>
        </>
      }
      label={t.dialogLabel}
      onClose={onClose}
      open={open}
      placement="panel"
      title={<Emphasized text={t.dialogTitle} />}
    >
      <p className="m-0 mt-4 max-w-[58ch] text-body text-graphite">{t.dialogBody}</p>

      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="h-60 overflow-hidden rounded-card md:sticky md:top-0 md:h-[32rem]">
          {open && (
            <DealerMap
              dealers={shown}
              onSelect={choose}
              origin={directory?.origin ?? null}
              selectedId={selectedId}
            />
          )}
        </div>

        <div className="min-w-0">
          <FieldLabel htmlFor={searchId}>{t.search}</FieldLabel>
          <TextField
            autoComplete="off"
            id={searchId}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
            type="search"
            value={query}
          />
          <p className="m-0 mt-3 text-caption text-ash">
            {directory?.origin ? t.nearest(directory.postcode) : t.noPostcode}
            {directory && ` · ${t.count(shown.length)}`}
          </p>

          {loadError ? (
            <p className="m-0 mt-6 text-caption text-ink">{t.loadFailed}</p>
          ) : !directory ? (
            <p className="m-0 mt-6 text-caption text-graphite">{t.loading}</p>
          ) : shown.length === 0 ? (
            <p className="m-0 mt-6 text-caption text-graphite">{t.noMatches}</p>
          ) : (
            <fieldset className="m-0 mt-4 border-0 p-0">
              <legend className="sr-only">{t.dialogLabel}</legend>
              <ul className="m-0 grid list-none gap-1 p-0">
                {shown.map((dealer) => (
                  <li key={dealer.id}>
                    <label
                      className={`flex min-h-11 cursor-pointer items-start gap-4 rounded-[6px] px-3 py-3 transition-colors duration-state ease-signature hover:bg-ink/[.06] has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-ink ${
                        dealer.id === selectedId ? "bg-ink/[.08]" : ""
                      }`}
                    >
                      <input
                        checked={dealer.id === selectedId}
                        className="mt-1.5 size-4 shrink-0 accent-signature"
                        name={`dealer-${project.id}`}
                        onChange={() => choose(dealer.id)}
                        type="radio"
                        value={dealer.id}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-body text-ink">{dealer.name}</span>
                          {dealer.distanceKm !== null && (
                            <span className="tnum shrink-0 text-caption text-graphite">
                              {t.distance(dealer.distanceKm)}
                            </span>
                          )}
                        </span>
                        <span className="block text-caption text-graphite">
                          {dealer.street} · {dealer.postalCode} {dealer.city}
                          {dealer.id === currentDealerId && ` · ${t.current}`}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}

          <div className="mt-8 border-t border-hairline pt-5">
            <h3 className="m-0 text-nav">{t.disclosureTitle}</h3>
            <p className="m-0 mt-2 text-caption text-graphite">{t.disclosure}</p>
            <dl className="m-0 mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1 text-caption">
              <dt className="text-ash">{messages.account.name}</dt>
              <dd className="m-0 truncate text-ink">{contact.name || t.noName}</dd>
              <dt className="text-ash">{messages.account.email}</dt>
              <dd className="m-0 truncate text-ink">{contact.email}</dd>
              <dt className="text-ash">{messages.account.phone}</dt>
              <dd className="m-0 truncate text-ink">{contact.phone || t.noPhone}</dd>
            </dl>
            <p className="m-0 mt-4 text-[0.75rem] text-ash">{t.postcodeSource}</p>
          </div>
        </div>
      </div>
    </Overlay>
  );
}
