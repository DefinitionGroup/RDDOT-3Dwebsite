"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { type FormEvent, useId, useRef, useState } from "react";
import { QUOTE_REQUEST_LIMITS } from "@/features/quote-requests/quote-request-contract";
import { formatQuoteRequestReference } from "@/features/quote-requests/quote-request-reference";
import type { SerializedQuoteRequest } from "@/features/quote-requests/serialize-quote-request";

type Outcome =
  | { kind: "idle" }
  | { kind: "conflict"; currentVersion: number }
  | { kind: "signed-out" }
  | { kind: "error"; message: string };

const FIELD =
  "mt-3 min-h-14 w-full border-0 border-b border-ink bg-transparent px-0 text-lg outline-none transition-colors placeholder:text-graphite focus:border-signature";

/**
 * The commercial handoff of the First Production Release: a Quote Request
 * against an exact, immutable revision of the Project. Labelled fields,
 * explicit consent, one live region for outcomes, and an idempotency key that
 * survives retries so a double click can never file two requests.
 */
export function QuoteRequestForm({
  expectedVersion,
  projectId,
  projectName
}: {
  expectedVersion: number;
  projectId: string;
  projectName: string;
}) {
  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const noteId = useId();
  const consentId = useId();
  const prefersReducedMotion = useReducedMotion();
  const idempotencyKey = useRef<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
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
          contact: { name, email, phone },
          note,
          consent: true
        })
      });
      const payload = (await response.json().catch(() => null)) as {
        quoteRequest?: SerializedQuoteRequest;
        currentVersion?: number;
        error?: string;
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
      setOutcome({
        kind: "error",
        message:
          payload?.error ??
          "Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut."
      });
    } catch {
      setOutcome({
        kind: "error",
        message: "Die Verbindung wurde unterbrochen. Bitte versuchen Sie es erneut."
      });
    } finally {
      setIsPending(false);
    }
  }

  if (submitted) {
    return (
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        aria-live="polite"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-signature">
          Anfrage eingegangen
        </p>
        <h1 className="mt-5 max-w-3xl font-editorial text-[clamp(2.6rem,7vw,5.6rem)] leading-[0.92]">
          Vielen Dank, {submitted.contact.name}.
        </h1>
        <p className="mt-6 max-w-[46ch] text-body leading-7 text-graphite">
          Ihre Anfrage für „{submitted.projectName}“ ist bei uns eingegangen.
          Unsere Planung prüft die Konfiguration und meldet sich bei Ihnen unter{" "}
          <span className="text-ink">{submitted.contact.email}</span>.
        </p>

        <dl className="mt-10 max-w-md space-y-3 border-t border-ink pt-5 text-body">
          <div className="flex justify-between gap-6 border-b border-hairline pb-3">
            <dt className="text-graphite">Referenz</dt>
            <dd className="font-semibold tracking-[0.06em] text-ink">
              {formatQuoteRequestReference(submitted.reference)}
            </dd>
          </div>
          <div className="flex justify-between gap-6 border-b border-hairline pb-3">
            <dt className="text-graphite">Eingegangen am</dt>
            <dd className="text-ink">
              {new Intl.DateTimeFormat("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              }).format(new Date(submitted.createdAt))}{" "}
              Uhr
            </dd>
          </div>
        </dl>

        <p className="mt-6 max-w-[46ch] text-sm leading-6 text-graphite">
          Die Anfrage bleibt mit genau diesem Planungsstand in Ihrem Bereich
          hinterlegt. Sie können Ihr Projekt weiter verändern, ohne die Anfrage
          zu berühren.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            className="inline-flex min-h-12 items-center justify-center bg-ink px-6 text-body text-paper transition-colors duration-300 hover:bg-signature"
            href="/konto"
          >
            Zu meinen Anfragen
          </Link>
          <Link
            className="inline-flex min-h-12 items-center justify-center border border-ink px-6 text-body text-ink transition-colors duration-300 hover:bg-ink hover:text-paper"
            href={`/configure?project=${projectId}`}
          >
            Zum Projekt
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-signature">
        Anfrage
      </p>
      <h1 className="mt-5 max-w-3xl font-editorial text-[clamp(2.6rem,7vw,5.6rem)] leading-[0.92]">
        Planung anfragen.
      </h1>
      <p className="mt-6 max-w-[46ch] text-body leading-7 text-graphite">
        Wir prüfen „{projectName}“ in genau diesem Stand und melden uns mit
        einem Angebot und den nächsten Schritten. Die Anfrage ist unverbindlich.
      </p>

      <form className="mt-10 max-w-xl" noValidate={false} onSubmit={submit}>
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <label className="block text-body text-ink" htmlFor={nameId}>
              Name
            </label>
            <input
              autoComplete="name"
              className={FIELD}
              id={nameId}
              maxLength={QUOTE_REQUEST_LIMITS.nameMax}
              onChange={(event) => setName(event.target.value)}
              required
              type="text"
              value={name}
            />
          </div>
          <div>
            <label className="block text-body text-ink" htmlFor={emailId}>
              E-Mail-Adresse
            </label>
            <input
              autoComplete="email"
              className={FIELD}
              id={emailId}
              maxLength={QUOTE_REQUEST_LIMITS.emailMax}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
        </div>

        <div className="mt-8">
          <label className="block text-body text-ink" htmlFor={phoneId}>
            Telefon <span className="text-graphite">(optional)</span>
          </label>
          <input
            autoComplete="tel"
            className={FIELD}
            id={phoneId}
            maxLength={QUOTE_REQUEST_LIMITS.phoneMax}
            onChange={(event) => setPhone(event.target.value)}
            type="tel"
            value={phone}
          />
        </div>

        <div className="mt-8">
          <label className="block text-body text-ink" htmlFor={noteId}>
            Notiz zur Planung <span className="text-graphite">(optional)</span>
          </label>
          <textarea
            className="mt-3 min-h-32 w-full border-0 border-b border-ink bg-transparent px-0 py-2 text-lg outline-none transition-colors placeholder:text-graphite focus:border-signature"
            id={noteId}
            maxLength={QUOTE_REQUEST_LIMITS.noteMax}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Raummaße, Wünsche, ein passender Zeitraum …"
            value={note}
          />
          <p className="mt-2 text-right text-xs text-graphite">
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
          <label className="text-sm leading-6 text-graphite" htmlFor={consentId}>
            Ich bin damit einverstanden, dass rotpunkt meine Angaben und diese
            Konfiguration zur Bearbeitung meiner Anfrage verarbeitet und mich
            dazu kontaktiert. Die Anfrage ist unverbindlich.
          </label>
        </div>

        <button
          className="mt-10 inline-flex min-h-12 w-full items-center justify-center bg-signature px-6 text-body text-paper transition-colors duration-300 hover:bg-ink disabled:cursor-wait disabled:bg-graphite sm:w-auto"
          disabled={isPending || !consent}
          type="submit"
        >
          {isPending ? "Anfrage wird gesendet …" : "Anfrage senden"}
        </button>

        <div aria-live="polite" className="mt-6 min-h-6 text-sm leading-6 text-signature">
          {outcome.kind === "error" && outcome.message}
          {outcome.kind === "signed-out" && (
            <>
              Ihre Sitzung ist abgelaufen.{" "}
              <Link
                className="underline decoration-hairline underline-offset-4 hover:text-ink"
                href={`/konto?next=${encodeURIComponent(`/anfrage?project=${projectId}`)}`}
              >
                Erneut anmelden
              </Link>
            </>
          )}
          {outcome.kind === "conflict" && (
            <>
              Dieses Projekt wurde inzwischen an anderer Stelle geändert.{" "}
              <button
                className="underline decoration-hairline underline-offset-4 hover:text-ink"
                onClick={() => window.location.reload()}
                type="button"
              >
                Aktuellen Stand laden
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
