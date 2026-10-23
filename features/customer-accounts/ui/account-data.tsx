"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Pill } from "@/components/design-system/pill";
import { ACCOUNT_HAS_REQUESTS } from "@/features/customer-accounts/account-deletion";
import { authClient } from "@/lib/auth-client";
import { localizePath } from "@/lib/i18n";
import { useLocale, useMessages } from "@/lib/messages/locale-context";

type DeleteState =
  | { kind: "idle" }
  | { kind: "confirming" }
  | { kind: "deleting" }
  | { kind: "needs-fresh-sign-in" }
  | { kind: "has-requests" }
  | { kind: "failed" };

/**
 * "Daten & Konto": the data download and the account's deletion. Deleting
 * needs a sign-in from the last 15 minutes (Better Auth refuses with
 * SESSION_EXPIRED otherwise) and is refused while the account has Quote
 * Requests, which the page already knows and says up front.
 */
export function AccountData({ hasRequests }: { hasRequests: boolean }) {
  const locale = useLocale();
  const t = useMessages().account;
  const router = useRouter();
  const [state, setState] = useState<DeleteState>(hasRequests ? { kind: "has-requests" } : { kind: "idle" });

  async function deleteAccount() {
    setState({ kind: "deleting" });
    try {
      const result = await authClient.deleteUser();
      if (result.error) {
        const code = (result.error as { code?: string }).code;
        setState(
          code === "SESSION_EXPIRED"
            ? { kind: "needs-fresh-sign-in" }
            : code === ACCOUNT_HAS_REQUESTS
              ? { kind: "has-requests" }
              : { kind: "failed" }
        );
        return;
      }
      startTransition(() => router.replace(localizePath(locale, "/")));
    } catch {
      setState({ kind: "failed" });
    }
  }

  async function signInAgain() {
    await authClient.signOut();
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid max-w-2xl gap-10">
      <div>
        <p className="m-0 max-w-[52ch] text-body text-graphite">{t.dataBody}</p>
        <a
          className="mt-6 inline-flex h-11 items-center rounded-pill border border-ink px-5 font-label text-nav leading-none text-ink transition-colors duration-state ease-signature hover:bg-ink/10"
          download
          href="/api/account/export"
        >
          {t.exportData}
        </a>
        <p className="m-0 mt-3 max-w-[60ch] text-caption text-ash">{t.exportHint}</p>
      </div>

      <div className="border-t border-hairline pt-6">
        <h3 className="m-0 text-nav">{t.deleteAccount}</h3>
        <p className="m-0 mt-2 max-w-[60ch] text-caption text-graphite">{t.deleteAccountBody}</p>
        <div aria-live="polite" className="mt-5">
          {state.kind === "has-requests" && (
            <p className="m-0 max-w-[60ch] text-caption text-ink">{t.accountHasRequests}</p>
          )}
          {state.kind === "idle" && (
            <Pill onClick={() => setState({ kind: "confirming" })} variant="ghost" className="-ml-5">
              {t.deleteAccount}
            </Pill>
          )}
          {(state.kind === "confirming" || state.kind === "deleting" || state.kind === "failed") && (
            <div className="grid gap-4">
              <p className="m-0 text-caption text-ink">
                {state.kind === "failed" ? t.accountDeleteFailed : t.deleteAccountWarning}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Pill disabled={state.kind === "deleting"} onClick={() => void deleteAccount()} variant="secondary">
                  {state.kind === "deleting" ? t.deletingAccount : t.confirmDeleteAccount}
                </Pill>
                <Pill
                  disabled={state.kind === "deleting"}
                  onClick={() => setState({ kind: "idle" })}
                  variant="ghost"
                >
                  {t.cancel}
                </Pill>
              </div>
            </div>
          )}
          {state.kind === "needs-fresh-sign-in" && (
            <div className="grid gap-4">
              <p className="m-0 max-w-[60ch] text-caption text-ink">{t.reauthRequired}</p>
              <div>
                <Pill onClick={() => void signInAgain()} variant="secondary">
                  {t.signOutToConfirm}
                </Pill>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
