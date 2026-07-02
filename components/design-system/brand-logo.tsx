import Link from "next/link";

type BrandLogoProps = {
  className?: string;
  tone?: "light" | "dark";
  compact?: boolean;
  href?: string;
};

export function BrandLogo({
  className = "",
  compact = false,
  href = "#top",
  tone = "dark"
}: BrandLogoProps) {
  const textTone = tone === "light" ? "text-white" : "text-ink";

  return (
    <Link
      aria-label="rotpunkt Signature Startseite"
      className={`group inline-flex items-baseline whitespace-nowrap font-base tracking-tight ${textTone} ${className}`}
      href={href}
    >
      <span className="relative inline-flex items-center text-[1.3rem] leading-none">
        r
        <span className="mx-[0.04em] inline-block size-[0.3em] rounded-full bg-signature transition-transform duration-300 ease-signature group-hover:scale-110" />
        tpunkt
      </span>
      {!compact && (
        <span className="ml-2.5 border-l border-current pl-2.5 text-[1.3rem] leading-none opacity-55">
          Signature
        </span>
      )}
    </Link>
  );
}
