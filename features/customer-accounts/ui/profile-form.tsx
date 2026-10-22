"use client";

import { FormEvent, useId, useState } from "react";
import { FieldLabel, TextField } from "@/components/design-system/field";
import { Pill } from "@/components/design-system/pill";
import {
  CUSTOMER_PROFILE_LIMITS,
  type CustomerProfile
} from "@/features/customer-accounts/customer-profile";
import { apiErrorMessage } from "@/lib/messages";
import { useMessages } from "@/lib/messages/locale-context";

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

/** Name, phone and postcode, each optional; the request form offers what is filled in. */
export function ProfileForm({
  email,
  initial,
  onSaved
}: {
  email: string;
  initial: CustomerProfile;
  onSaved?: (profile: CustomerProfile) => void;
}) {
  const messages = useMessages();
  const t = messages.account;
  const nameId = useId();
  const phoneId = useId();
  const postalCodeId = useId();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const changed =
    draft.name !== saved.name || draft.phone !== saved.phone || draft.postalCode !== saved.postalCode;

  function edit(field: keyof CustomerProfile, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    if (state.kind !== "saving") setState({ kind: "idle" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "saving" });
    try {
      const response = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const payload = (await response.json().catch(() => null)) as { profile?: CustomerProfile } | null;
      if (!response.ok || !payload?.profile) {
        setState({ kind: "error", message: apiErrorMessage(messages, payload, t.profileFailed) });
        return;
      }
      setSaved(payload.profile);
      setDraft(payload.profile);
      setState({ kind: "saved" });
      onSaved?.(payload.profile);
    } catch {
      setState({ kind: "error", message: messages.common.connectionLostRetry });
    }
  }

  return (
    <form className="max-w-2xl" onSubmit={submit}>
      <p className="m-0 max-w-[52ch] text-body text-graphite">{t.profileBody}</p>
      <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel htmlFor={nameId} hint={t.optional}>
            {t.name}
          </FieldLabel>
          <TextField
            autoComplete="name"
            id={nameId}
            maxLength={CUSTOMER_PROFILE_LIMITS.nameMax}
            onChange={(event) => edit("name", event.target.value)}
            value={draft.name}
          />
        </div>
        <div>
          <FieldLabel htmlFor={phoneId} hint={t.optional}>
            {t.phone}
          </FieldLabel>
          <TextField
            autoComplete="tel"
            id={phoneId}
            inputMode="tel"
            maxLength={CUSTOMER_PROFILE_LIMITS.phoneMax}
            onChange={(event) => edit("phone", event.target.value)}
            type="tel"
            value={draft.phone}
          />
        </div>
        <div>
          <FieldLabel htmlFor={postalCodeId} hint={t.postalCodeHint}>
            {t.postalCode}
          </FieldLabel>
          <TextField
            autoCapitalize="characters"
            autoComplete="postal-code"
            id={postalCodeId}
            maxLength={CUSTOMER_PROFILE_LIMITS.postalCodeMax}
            onChange={(event) => edit("postalCode", event.target.value)}
            value={draft.postalCode}
          />
        </div>
      </div>
      <p className="m-0 mt-8 text-caption text-graphite">{t.signedInAs(email)}</p>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Pill disabled={!changed || state.kind === "saving"} type="submit" variant="secondary">
          {state.kind === "saving" ? t.savingProfile : t.saveProfile}
        </Pill>
        <p aria-live="polite" className="m-0 text-caption text-graphite">
          {state.kind === "saved" && t.profileSaved}
          {state.kind === "error" && <span className="text-ink">{state.message}</span>}
        </p>
      </div>
    </form>
  );
}
