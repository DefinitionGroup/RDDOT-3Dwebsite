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
      className={`group inline-flex items-center whitespace-nowrap font-brand ${textTone} ${className}`}
      href={href}
    >
      <span className="relative inline-flex items-center text-[1.75rem] font-semibold leading-none md:text-[2.45rem]">
        r
        <span className="mx-[0.02em] inline-block size-[0.34em] rounded-full bg-signature transition-transform duration-300 ease-signature group-hover:scale-110" />
        tpunkt
      </span>
      {!compact && (
        <>
          <span className="mx-3 h-[1.55rem] w-px bg-current opacity-65 md:h-[2.15rem]" />
          <span className="font-editorial text-[1.85rem] leading-none md:text-[2.55rem]">
            Signature
          </span>
        </>
      )}
    </Link>
  );
}
