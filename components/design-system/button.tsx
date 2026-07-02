import type { AnchorHTMLAttributes, ReactNode } from "react";

type SignatureButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  tone?: "solid" | "glass" | "light";
};

const toneClass = {
  solid: "border border-ink bg-ink text-paper hover:bg-transparent hover:text-ink",
  glass: "border border-white/40 bg-transparent text-white hover:border-white hover:bg-white hover:text-ink",
  light: "border border-ink bg-transparent text-ink hover:bg-ink hover:text-paper"
};

export function SignatureButton({
  children,
  className = "",
  tone = "solid",
  href = "#",
  ...props
}: SignatureButtonProps) {
  return (
    <a
      className={`group inline-flex min-h-11 items-center gap-3 px-6 py-3 text-body leading-none transition-colors duration-300 ease-signature ${toneClass[tone]} ${className}`}
      href={href}
      {...props}
    >
      <span>{children}</span>
      <svg
        aria-hidden="true"
        className="size-3 transition-transform duration-300 ease-signature group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        fill="none"
        viewBox="0 0 12 12"
      >
        <path
          d="M2 10 10 2M4 2h6v6"
          stroke="currentColor"
          strokeLinecap="square"
          strokeWidth="1.2"
        />
      </svg>
    </a>
  );
}
