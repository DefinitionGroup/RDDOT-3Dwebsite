type CartIndicatorProps = {
  tone?: "light" | "dark";
  count?: number;
  href?: string;
};

export function CartIndicator({ count = 0, href = "/checkout", tone = "light" }: CartIndicatorProps) {
  const strokeTone = tone === "light" ? "text-white" : "text-ink";

  return (
    <a
      aria-label={`${count} Artikel im Warenkorb`}
      className={`group relative grid size-12 place-items-center ${strokeTone}`}
      href={href}
    >
      {count > 0 && (
        <span className="absolute right-0 top-0 z-10 grid size-7 place-items-center rounded-full bg-ember text-xs font-medium text-white transition-transform duration-300 ease-signature group-hover:scale-105">
          {count}
        </span>
      )}
      <svg
        aria-hidden="true"
        className="mt-2 h-8 w-9 overflow-visible transition-transform duration-300 ease-signature group-hover:-translate-y-0.5"
        fill="none"
        viewBox="0 0 32 34"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 4h4.3l4.25 20.45c.12.57.44 1.08.9 1.44.46.37 1.03.56 1.61.56H28"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
        <path
          d="M8.25 10.5H29.2l-1.75 9.15a3 3 0 0 1-2.95 2.45H11"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
        <circle cx="13" cy="31" fill="currentColor" r="2.15" />
        <circle cx="25" cy="31" fill="currentColor" r="2.15" />
      </svg>
    </a>
  );
}
