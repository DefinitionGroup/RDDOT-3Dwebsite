"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { type ReactNode, startTransition, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { Emphasized } from "@/components/design-system/emphasized";
import { FieldLabel, TextField } from "@/components/design-system/field";
import { Pill } from "@/components/design-system/pill";
import { authClient } from "@/lib/auth-client";
import { localizePath, LOCALE_HEADER } from "@/lib/i18n";
import type { Messages } from "@/lib/messages";
import { useLocale, useMessages } from "@/lib/messages/locale-context";
import { DURATION, REVEAL_RISE, SIGNATURE_EASE } from "@/lib/motion";

type Step = "email" | "code";

type DevelopmentCapture = {
  code: string;
  subject: string;
};

function getErrorMessage(
  error: { message?: string; status?: number } | null,
  t: Messages["account"]
) {
  return error?.status === 429 ? t.tooManyAttempts : t.signInFailed;
}

/** Busy while the form's action runs, including one replayed after hydration. */
function SubmitPill({
  busyLabel,
  children,
  disabled = false
}: {
  busyLabel: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Pill className="mt-8 w-full" disabled={pending || disabled} type="submit">
      {pending ? busyLabel : children}
    </Pill>
  );
}

const step = {
  initial: { opacity: 0, y: REVEAL_RISE },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -REVEAL_RISE / 2 },
  transition: { duration: DURATION.overlay, ease: SIGNATURE_EASE }
};

export function AccountAccess({
  returnTo,
  developmentCaptureEnabled = false
}: {
  returnTo?: string;
  /** Server-decided: the deployment keeps authentication mails and shows the code here. */
  developmentCaptureEnabled?: boolean;
}) {
  const locale = useLocale();
  const t = useMessages().account;
  const router = useRouter();
  const emailId = useId();
  const codeId = useId();
  const [currentStep, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [developmentCapture, setDevelopmentCapture] =
    useState<DevelopmentCapture | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDevelopmentCapture(address: string) {
    if (!developmentCaptureEnabled) return;

    const response = await fetch(
      `/api/dev/authentication-email?email=${encodeURIComponent(address)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return;
    setDevelopmentCapture((await response.json()) as DevelopmentCapture);
  }

  // Both forms are actions, not submit handlers: a form sent before the page's
  // script has loaded is held by React and replayed once it has, with what was
  // typed. A plain form would load the page again without its query and drop
  // a pending save. So each action reads its fields from the submitted form.
  async function sendCode(form: FormData) {
    const address = String(form.get("email") ?? "").trim();
    setEmail(address);
    setMessage(null);
    setDevelopmentCapture(null);

    // The code arrives in the language of this page.
    const result = await authClient.emailOtp.sendVerificationOtp(
      { email: address, type: "sign-in" },
      { headers: { [LOCALE_HEADER]: locale } }
    );

    if (result.error) {
      setMessage(getErrorMessage(result.error, t));
      return;
    }

    await loadDevelopmentCapture(address);
    setStep("code");
  }

  async function verifyCode(form: FormData) {
    setMessage(null);

    const result = await authClient.signIn.emailOtp({
      email,
      otp: String(form.get("code") ?? "")
    });

    if (result.error) {
      setMessage(getErrorMessage(result.error, t));
      return;
    }

    startTransition(() => router.replace(returnTo ?? localizePath(locale, "/konto")));
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
              <Emphasized text={t.signInTitle} />
            </h1>
            <p className="m-0 mt-6 max-w-[42ch] text-body text-graphite">{t.signInBody}</p>

            <form action={sendCode} className="mt-10">
              <FieldLabel htmlFor={emailId}>{t.email}</FieldLabel>
              <TextField
                autoComplete="email"
                autoFocus
                id={emailId}
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t.emailPlaceholder}
                required
                type="email"
                value={email}
              />
              <SubmitPill busyLabel={t.preparingCode}>{t.requestCode}</SubmitPill>
            </form>

            <p className="m-0 mt-5 text-caption text-graphite">{t.signInNote}</p>
          </motion.div>
        ) : (
          <motion.div key="code" {...step}>
            <Pill className="-ml-5 mb-6" onClick={returnToEmail} variant="ghost">
              {t.changeEmail}
            </Pill>
            <h1 className="m-0 max-w-md text-heading">
              <Emphasized text={t.codeTitle} />
            </h1>
            <p className="m-0 mt-6 max-w-[42ch] text-body text-graphite">
              {t.codeSentBefore}
              <strong className="font-label text-ink">{email}</strong>
              {t.codeSentAfter}
            </p>

            <form action={verifyCode} className="mt-10">
              <FieldLabel htmlFor={codeId}>{t.code}</FieldLabel>
              <TextField
                autoComplete="one-time-code"
                autoFocus
                className="tnum h-16 text-title tracking-[0.2em]"
                id={codeId}
                inputMode="numeric"
                maxLength={6}
                name="code"
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                pattern="[0-9]{6}"
                placeholder="000000"
                required
                value={code}
              />
              <SubmitPill busyLabel={t.signingIn} disabled={code.length !== 6}>
                {t.signIn}
              </SubmitPill>
            </form>

            {developmentCapture && (
              <div className="mt-8 rounded-card border border-hairline p-4">
                <p className="m-0 font-label text-label uppercase tracking-label text-graphite">
                  {t.developmentOnly}
                </p>
                <button
                  className="tnum mt-2 inline-flex min-h-11 items-center text-left text-title text-ink transition-colors duration-state ease-signature hover:text-porcelain"
                  onClick={() => setCode(developmentCapture.code)}
                  type="button"
                >
                  {developmentCapture.code}
                  <span className="ml-3 text-caption tracking-normal text-graphite">
                    {t.insertCode}
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
