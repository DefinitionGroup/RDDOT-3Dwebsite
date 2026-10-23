"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { type FormEvent, useId, useRef, useState } from "react";
import { Emphasized } from "@/components/design-system/emphasized";
import { ChoiceField, FieldLabel, TextArea, TextField } from "@/components/design-system/field";
import { Label } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import { INTL_LOCALE, localizePath } from "@/lib/i18n";
import { apiErrorMessage } from "@/lib/messages";
import { useLocale, useMessages } from "@/lib/messages/locale-context";
import { DURATION, REVEAL_RISE, SIGNATURE_EASE } from "@/lib/motion";
import type { CustomerProfile } from "@/features/customer-accounts/customer-profile";
import {
  CustomerTypeFields,
  customValidity,
  ReachFields,
  SalutationFields
} from "@/features/customer-accounts/ui/contact-details-fields";
import {
  type ContactDetails,
  QUOTE_REQUEST_LIMITS,
  QUOTE_REQUESTS_REACH_ROTPUNKT,
  type QuoteRequestPlanning
} from "@/features/quote-requests/quote-request-contract";
import { formatQuoteRequestReference } from "@/features/quote-requests/quote-request-reference";
import type { SerializedQuoteRequest } from "@/features/quote-requests/serialize-quote-request";

type Outcome =
  | { kind: "idle" }
  | { kind: "conflict"; currentVersion: number }
  | { kind: "signed-out" }
  | { kind: "error"; message: string };

/**
 * The commercial handoff of the First Production Release: a Quote Request
 * against an exact, immutable revision of the Project. Labelled fields,
 * explicit consent, one live region for outcomes, and an idempotency key that
 * survives retries so a double click can never file two requests.
 */
export function QuoteRequestForm({
  expectedVersion,
  initialContact,
  projectId,
  projectName
}: {
  expectedVersion: number;
  /** What the account already knows: the profile and the sign-in email. */
  initialContact?: CustomerProfile & { email: string };
  projectId: string;
  projectName: string;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const t = messages.request;
  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const postalCodeId = useId();
  const wallLengthId = useId();
  const planningId = useId();
  const noteId = useId();
  const consentId = useId();
  const prefersReducedMotion = useReducedMotion();
  const idempotencyKey = useRef<string | null>(null);

  const [name, setName] = useState(initialContact?.name ?? "");
  const [email, setEmail] = useState(initialContact?.email ?? "");
  const [phone, setPhone] = useState(initialContact?.phone ?? "");
  const [postalCode, setPostalCode] = useState(initialContact?.postalCode ?? "");
  const [details, setDetails] = useState<ContactDetails>({
    salutation: initialContact?.salutation ?? "",
    title: initialContact?.title ?? "",
    contactChannel: initialContact?.contactChannel ?? "",
    contactTime: initialContact?.contactTime ?? "",
    customerType: initialContact?.customerType ?? "",
    company: initialContact?.company ?? "",
    professionalRole: initialContact?.professionalRole ?? ""
  });
  const [planning, setPlanning] = useState<Omit<QuoteRequestPlanning, "wallLengthCm">>({
    projectKind: "",
    timeframe: "",
    budgetBand: ""
  });
  const [wallLength, setWallLength] = useState("");
  const [note, setNote] = useState("");
  const phoneRequired = details.contactChannel === "phone";
  const editDetails = (patch: Partial<ContactDetails>) => setDetails((current) => ({ ...current, ...patch }));
  const [consent, setConsent] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const [submitted, setSubmitted] = useState<SerializedQuoteRequest | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) return;
    setIsPending(true);
    setOutcome({ kind: "idle" });
    // Kept across retries and cleared on success: the server replays the
    // same key instead of filing a second request.
    idempotencyKey.current ??= crypto.randomUUID();

    try {
      const response = await fetch(`/api/projects/${projectId}/quote-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion,
          idempotencyKey: idempotencyKey.current,
          contact: { name, email, phone, postalCode, ...details },
          planning: { ...planning, wallLengthCm: wallLength.trim() === "" ? null : Number(wallLength) },
          note,
          consent: true
        })
      });
      const payload = (await response.json().catch(() => null)) as {
        quoteRequest?: SerializedQuoteRequest;
        currentVersion?: number;
      } | null;

      if (response.ok && payload?.quoteRequest) {
        idempotencyKey.current = null;
        setSubmitted(payload.quoteRequest);
        return;
      }
      if (response.status === 401) {
        setOutcome({ kind: "signed-out" });
        return;
      }
      if (response.status === 409 && typeof payload?.currentVersion === "number") {
        setOutcome({ kind: "conflict", currentVersion: payload.currentVersion });
        return;
      }
      setOutcome({ kind: "error", message: apiErrorMessage(messages, payload, t.failed) });
    } catch {
      setOutcome({ kind: "error", message: messages.common.connectionLostRetry });
    } finally {
      setIsPending(false);
    }
  }

  if (submitted) {
    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        aria-live="polite"
        initial={prefersReducedMotion ? false : { opacity: 0, y: REVEAL_RISE }}
        transition={{ duration: DURATION.reveal, ease: SIGNATURE_EASE }}
      >
        <Label>{QUOTE_REQUESTS_REACH_ROTPUNKT ? t.receivedLabel : t.savedLabel}</Label>
        <h1 className="m-0 mt-5 max-w-3xl text-heading">
          <Emphasized text={t.thanks} /> {submitted.contact.name}.
        </h1>
        {QUOTE_REQUESTS_REACH_ROTPUNKT ? (
          <p className="m-0 mt-6 max-w-[46ch] text-body text-graphite">
            {t.receivedBody(submitted.projectName)}{" "}
            <span className="text-ink">{submitted.contact.email}</span>.
          </p>
        ) : (
          <>
            <p className="m-0 mt-6 max-w-[46ch] text-body text-graphite">{t.savedBody(submitted.projectName)}</p>
            <p className="m-0 mt-4 max-w-[52ch] text-caption text-ink">{t.notDeliveredNote}</p>
          </>
        )}

        <dl className="tnum m-0 mt-10 flex max-w-md flex-col border-t border-ink text-[0.875rem]">
          <div className="flex justify-between gap-6 border-b border-hairline py-3">
            <dt className="font-label text-label uppercase tracking-label text-graphite">{t.reference}</dt>
            <dd className="m-0 font-label tracking-[0.06em] text-ink">
              {formatQuoteRequestReference(submitted.reference)}
            </dd>
          </div>
          <div className="flex justify-between gap-6 border-b border-hairline py-3">
            <dt className="font-label text-label uppercase tracking-label text-graphite">{t.received}</dt>
            <dd className="m-0 text-ink">
              {messages.common.clockTime(
                new Intl.DateTimeFormat(INTL_LOCALE[locale], {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                }).format(new Date(submitted.createdAt))
              )}
            </dd>
          </div>
        </dl>

        <p className="m-0 mt-6 max-w-[46ch] text-caption text-graphite">{t.keptNote}</p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Pill href={localizePath(locale, "/konto")}>{t.toRequests}</Pill>
          <Pill href={localizePath(locale, `/configure?project=${projectId}`)} variant="secondary">
            {t.toProject}
          </Pill>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      <Label>{t.label}</Label>
      <h1 className="m-0 mt-5 max-w-3xl text-heading">
        <Emphasized text={t.title} />
      </h1>
      <p className="m-0 mt-6 max-w-[46ch] text-body text-graphite">{t.intro(projectName)}</p>

      <form className="mt-10 max-w-xl" noValidate={false} onSubmit={submit}>
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          <SalutationFields onChange={editDetails} value={details} />
          <div>
            <FieldLabel htmlFor={nameId}>{t.name}</FieldLabel>
            <TextField
              autoComplete="name"
              id={nameId}
              maxLength={QUOTE_REQUEST_LIMITS.nameMax}
              onChange={(event) => setName(event.target.value)}
              required
              type="text"
              value={name}
            />
          </div>
          <div>
            <FieldLabel htmlFor={emailId}>{t.email}</FieldLabel>
            <TextField
              autoComplete="email"
              id={emailId}
              maxLength={QUOTE_REQUEST_LIMITS.emailMax}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          <div>
            <FieldLabel hint={phoneRequired ? undefined : t.optional} htmlFor={phoneId}>
              {t.phone}
            </FieldLabel>
            <TextField
              autoComplete="tel"
              id={phoneId}
              maxLength={QUOTE_REQUEST_LIMITS.phoneMax}
              onChange={(event) => setPhone(event.target.value)}
              required={phoneRequired}
              type="tel"
              value={phone}
              {...customValidity(messages.contactDetails.phoneForCalls)}
            />
          </div>
          <div>
            <FieldLabel hint={t.optional} htmlFor={postalCodeId}>
              {messages.account.postalCode}
            </FieldLabel>
            <TextField
              autoCapitalize="characters"
              autoComplete="postal-code"
              id={postalCodeId}
              maxLength={QUOTE_REQUEST_LIMITS.postalCodeMax}
              onChange={(event) => setPostalCode(event.target.value)}
              value={postalCode}
            />
          </div>
          <ReachFields onChange={editDetails} value={details} />
          <CustomerTypeFields onChange={editDetails} value={details} />
        </div>

        <section aria-labelledby={planningId} className="mt-14 border-t border-hairline pt-8">
          <h2 className="m-0 text-nav" id={planningId}>
            {messages.planningFacts.heading}
          </h2>
          <p className="m-0 mt-2 max-w-[52ch] text-caption text-graphite">{messages.planningFacts.body}</p>
          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            <ChoiceField
              emptyLabel={messages.contactDetails.noAnswer}
              label={messages.planningFacts.projectKind}
              onChange={(projectKind) => setPlanning((current) => ({ ...current, projectKind }))}
              options={messages.planningFacts.projectKinds}
              value={planning.projectKind}
            />
            <ChoiceField
              emptyLabel={messages.contactDetails.noAnswer}
              label={messages.planningFacts.timeframe}
              onChange={(timeframe) => setPlanning((current) => ({ ...current, timeframe }))}
              options={messages.planningFacts.timeframes}
              value={planning.timeframe}
            />
            <ChoiceField
              emptyLabel={messages.contactDetails.noAnswer}
              label={messages.planningFacts.budget}
              onChange={(budgetBand) => setPlanning((current) => ({ ...current, budgetBand }))}
              options={messages.planningFacts.budgetBands}
              value={planning.budgetBand}
            />
            <div>
              <FieldLabel hint={messages.planningFacts.wallLengthHint} htmlFor={wallLengthId}>
                {messages.planningFacts.wallLength}
              </FieldLabel>
              <TextField
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                id={wallLengthId}
                inputMode="numeric"
                max={QUOTE_REQUEST_LIMITS.wallLengthMaxCm}
                min={QUOTE_REQUEST_LIMITS.wallLengthMinCm}
                onChange={(event) => setWallLength(event.target.value)}
                step={1}
                type="number"
                value={wallLength}
                {...customValidity(messages.planningFacts.wallLengthRange)}
              />
            </div>
          </div>
        </section>

        <div className="mt-8">
          <FieldLabel hint={t.optional} htmlFor={noteId}>
            {t.note}
          </FieldLabel>
          <TextArea
            id={noteId}
            maxLength={QUOTE_REQUEST_LIMITS.noteMax}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t.notePlaceholder}
            value={note}
          />
          <p className="tnum m-0 mt-2 text-right text-caption text-ash">
            {note.length} / {QUOTE_REQUEST_LIMITS.noteMax}
          </p>
        </div>

        <div className="mt-8 flex items-start gap-4">
          <input
            checked={consent}
            className="mt-1.5 size-4 shrink-0 accent-signature"
            id={consentId}
            onChange={(event) => setConsent(event.target.checked)}
            required
            type="checkbox"
          />
          <label className="text-caption text-graphite" htmlFor={consentId}>
            {t.consent}
          </label>
        </div>

        <Pill className="mt-10 w-full sm:w-auto" disabled={isPending || !consent} type="submit">
          {isPending ? t.submitting : t.submit}
        </Pill>

        <div aria-live="polite" className="mt-6 min-h-6 text-caption text-ink">
          {outcome.kind === "error" && outcome.message}
          {outcome.kind === "signed-out" && (
            <>
              {t.sessionExpired}{" "}
              <Link
                className="underline decoration-hairline underline-offset-4 transition-colors duration-state ease-signature hover:text-porcelain"
                href={localizePath(
                  locale,
                  `/konto?next=${encodeURIComponent(localizePath(locale, `/anfrage?project=${projectId}`))}`
                )}
              >
                {t.signInAgain}
              </Link>
            </>
          )}
          {outcome.kind === "conflict" && (
            <>
              {t.conflict}{" "}
              <button
                className="underline decoration-hairline underline-offset-4 transition-colors duration-state ease-signature hover:text-porcelain"
                onClick={() => window.location.reload()}
                type="button"
              >
                {t.loadLatest}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
