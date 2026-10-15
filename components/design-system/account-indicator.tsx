import Link from "next/link";
import { localizePath, type Locale } from "@/lib/i18n";
import { getMessages } from "@/lib/messages";

export function AccountIndicator({ locale }: { locale: Locale }) {
  return (
    <Link
      aria-label={getMessages(locale).common.account}
      className="group grid size-11 place-items-center rounded-pill text-ink transition-colors duration-state ease-signature hover:bg-ink/[.08]"
      href={localizePath(locale, "/konto")}
    >
      <svg aria-hidden="true" className="size-6" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M5.5 20c.35-4.05 2.52-6.1 6.5-6.1s6.15 2.05 6.5 6.1"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.4"
        />
      </svg>
    </Link>
  );
}
