"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { FormEvent, startTransition, useId, useState } from "react";
import { FieldLabel, TextField } from "@/components/design-system/field";
import { Pill } from "@/components/design-system/pill";
import { authClient } from "@/lib/auth-client";
import { DURATION, REVEAL_RISE, SIGNATURE_EASE } from "@/lib/motion";

type Step = "email" | "code";

type DevelopmentCapture = {
  code: string;
  subject: string;
};

function getErrorMessage(error: { message?: string; status?: number } | null) {
  if (error?.status === 429) {
    return "Zu viele Versuche. Bitte warten Sie einige Minuten und versuchen Sie es dann erneut.";
  }

  return "Das hat noch nicht funktioniert. Prüfen Sie Ihre Eingabe und versuchen Sie es erneut.";
}

const step = {
  initial: { opacity: 0, y: REVEAL_RISE },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -REVEAL_RISE / 2 },
  transition: { duration: DURATION.overlay, ease: SIGNATURE_EASE }
};

export function AccountAccess({ returnTo = "/konto" }: { returnTo?: string }) {
  const router = useRouter();
  const emailId = useId();
  const codeId = useId();
  const [currentStep, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [developmentCapture, setDevelopmentCapture] =
    useState<DevelopmentCapture | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDevelopmentCapture(address: string) {
    if (process.env.NODE_ENV === "production") return;

    const response = await fetch(
      `/api/dev/authentication-email?email=${encodeURIComponent(address)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return;
    setDevelopmentCapture((await response.json()) as DevelopmentCapture);
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);
    setDevelopmentCapture(null);

    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in"
    });

    if (result.error) {
      setMessage(getErrorMessage(result.error));
      setIsPending(false);
      return;
    }

    await loadDevelopmentCapture(email);
    setStep("code");
    setIsPending(false);
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);

    const result = await authClient.signIn.emailOtp({
      email,
      otp: code
    });

    if (result.error) {
      setMessage(getErrorMessage(result.error));
      setIsPending(false);
      return;
    }

    startTransition(() => router.replace(returnTo));
  }

  function returnToEmail() {
    setStep("email");
    setCode("");
    setMessage(null);
    setDevelopmentCapture(null);
  }

  return (
    <div className="w-full max-w-[31rem]">
      <AnimatePresence initial={false} mode="wait">
        {currentStep === "email" ? (
          <motion.div key="email" {...step}>
            <h1 className="m-0 max-w-md text-heading">
              Planung <em>fortsetzen</em>.
            </h1>
            <p className="m-0 mt-6 max-w-[42ch] text-body text-graphite">
              Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen einmaligen Code – ohne
              Passwort und ohne neues Kontoformular.
            </p>

            <form className="mt-10" onSubmit={sendCode}>
              <FieldLabel htmlFor={emailId}>E-Mail-Adresse</FieldLabel>
              <TextField
                autoComplete="email"
                autoFocus
                id={emailId}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@beispiel.de"
                required
                type="email"
                value={email}
              />
              <Pill className="mt-8 w-full" disabled={isPending} type="submit">
                {isPending ? "Code wird vorbereitet …" : "Code anfordern"}
              </Pill>
            </form>

            <p className="m-0 mt-5 text-caption text-graphite">
              Mit dem Code melden Sie sich an oder erstellen beim ersten Mal automatisch Ihren
              privaten Planungsbereich.
            </p>
          </motion.div>
        ) : (
          <motion.div key="code" {...step}>
            <Pill className="-ml-5 mb-6" onClick={returnToEmail} variant="ghost">
              E-Mail-Adresse ändern
            </Pill>
            <h1 className="m-0 max-w-md text-heading">
              Sechs <em>Ziffern</em>.
            </h1>
            <p className="m-0 mt-6 max-w-[42ch] text-body text-graphite">
              Wir haben den Code an <strong className="font-label text-ink">{email}</strong>{" "}
              gesendet. Er ist fünf Minuten gültig.
            </p>

            <form className="mt-10" onSubmit={verifyCode}>
              <FieldLabel htmlFor={codeId}>Einmaliger Code</FieldLabel>
              <TextField
                autoComplete="one-time-code"
                autoFocus
                className="tnum h-16 text-title tracking-[0.2em]"
                id={codeId}
                inputMode="numeric"
                maxLength={6}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                pattern="[0-9]{6}"
                placeholder="000000"
                required
                value={code}
              />
              <Pill
                className="mt-8 w-full"
                disabled={isPending || code.length !== 6}
                type="submit"
              >
                {isPending ? "Anmeldung läuft …" : "Sicher anmelden"}
              </Pill>
            </form>

            {developmentCapture && (
              <div className="mt-8 rounded-card border border-hairline p-4">
                <p className="m-0 font-label text-label uppercase tracking-label text-graphite">
                  Nur in der lokalen Entwicklung
                </p>
                <button
                  className="tnum mt-2 inline-flex min-h-11 items-center text-left text-title text-ink transition-colors duration-state ease-signature hover:text-porcelain"
                  onClick={() => setCode(developmentCapture.code)}
                  type="button"
                >
                  {developmentCapture.code}
                  <span className="ml-3 text-caption tracking-normal text-graphite">
                    zum Einsetzen
                  </span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <p aria-live="polite" className="m-0 mt-6 min-h-6 text-caption text-ink">
        {message}
      </p>
    </div>
  );
}
