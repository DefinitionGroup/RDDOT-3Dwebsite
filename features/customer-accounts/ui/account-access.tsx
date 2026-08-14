"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { FormEvent, startTransition, useId, useState } from "react";
import { authClient } from "@/lib/auth-client";

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

export function AccountAccess({ returnTo = "/konto" }: { returnTo?: string }) {
  const router = useRouter();
  const emailId = useId();
  const codeId = useId();
  const [step, setStep] = useState<Step>("email");
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
      <AnimatePresence mode="wait" initial={false}>
        {step === "email" ? (
          <motion.div
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
            key="email"
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="max-w-md text-[clamp(2.65rem,6vw,4.8rem)] font-[200] leading-[0.96] tracking-[-0.03em]">
              Planung fortsetzen.
            </h1>
            <p className="mt-6 max-w-[42ch] text-body text-graphite">
              Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen einmaligen
              Code – ohne Passwort und ohne neues Kontoformular.
            </p>

            <form className="mt-10" onSubmit={sendCode}>
              <label className="block text-body text-ink" htmlFor={emailId}>
                E-Mail-Adresse
              </label>
              <input
                autoComplete="email"
                autoFocus
                className="mt-3 min-h-14 w-full border-0 border-b border-ink bg-transparent px-0 text-lg outline-none transition-colors placeholder:text-graphite focus:border-signature"
                id={emailId}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@beispiel.de"
                required
                type="email"
                value={email}
              />
              <button
                className="mt-8 inline-flex min-h-12 w-full items-center justify-center bg-ink px-6 text-body text-paper transition-colors duration-300 hover:bg-signature disabled:cursor-wait disabled:bg-graphite"
                disabled={isPending}
                type="submit"
              >
                {isPending ? "Code wird vorbereitet …" : "Code anfordern"}
              </button>
            </form>

            <p className="mt-5 text-sm leading-6 text-graphite">
              Mit dem Code melden Sie sich an oder erstellen beim ersten Mal
              automatisch Ihren privaten Planungsbereich.
            </p>
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
            key="code"
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              className="mb-8 text-body text-graphite underline decoration-hairline underline-offset-4 transition-colors hover:text-ink"
              onClick={returnToEmail}
              type="button"
            >
              E-Mail-Adresse ändern
            </button>
            <h1 className="max-w-md text-[clamp(2.65rem,6vw,4.8rem)] font-[200] leading-[0.96] tracking-[-0.03em]">
              Sechs Ziffern.
            </h1>
            <p className="mt-6 max-w-[42ch] text-body text-graphite">
              Wir haben den Code an <strong className="text-ink">{email}</strong>{" "}
              gesendet. Er ist fünf Minuten gültig.
            </p>

            <form className="mt-10" onSubmit={verifyCode}>
              <label className="block text-body text-ink" htmlFor={codeId}>
                Einmaliger Code
              </label>
              <input
                autoComplete="one-time-code"
                autoFocus
                className="mt-3 min-h-16 w-full border-0 border-b border-ink bg-transparent px-0 text-[2rem] tracking-[0.2em] outline-none transition-colors placeholder:text-graphite focus:border-signature"
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
              <button
                className="mt-8 inline-flex min-h-12 w-full items-center justify-center bg-signature px-6 text-body text-paper transition-colors duration-300 hover:bg-ink disabled:cursor-wait disabled:bg-graphite"
                disabled={isPending || code.length !== 6}
                type="submit"
              >
                {isPending ? "Anmeldung läuft …" : "Sicher anmelden"}
              </button>
            </form>

            {developmentCapture && (
              <div className="mt-8 border-t border-hairline pt-5">
                <p className="text-sm text-graphite">Nur in der lokalen Entwicklung</p>
                <button
                  className="mt-2 text-left text-2xl tracking-[0.18em] text-ink transition-colors hover:text-signature"
                  onClick={() => setCode(developmentCapture.code)}
                  type="button"
                >
                  {developmentCapture.code}
                  <span className="ml-3 text-sm tracking-normal text-graphite">
                    zum Einsetzen
                  </span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <p aria-live="polite" className="mt-6 min-h-6 text-sm text-signature">
        {message}
      </p>
    </div>
  );
}
