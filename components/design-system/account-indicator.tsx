import Link from "next/link";

export function AccountIndicator({ tone = "dark" }: { tone?: "light" | "dark" }) {
  const color = tone === "light" ? "text-white" : "text-ink";

  return (
    <Link
      aria-label="Mein Bereich"
      className={`group grid size-11 place-items-center ${color}`}
      href="/konto"
    >
      <svg
        aria-hidden="true"
        className="size-6 transition-opacity duration-300 ease-signature group-hover:opacity-60"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M5.5 20c.35-4.05 2.52-6.1 6.5-6.1s6.15 2.05 6.5 6.1"
          stroke="currentColor"
          strokeLinecap="square"
          strokeWidth="1.4"
        />
      </svg>
    </Link>
  );
}
