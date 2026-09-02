import Link from "next/link";

type BrandLogoProps = {
  className?: string;
  /** Hides the "Signature" suffix on tight surfaces. */
  compact?: boolean;
  href?: string;
};

/** The wordmark: weight 500, the red dot as the o. Always white — every surface is dark. */
export function BrandLogo({ className = "", compact = false, href = "/" }: BrandLogoProps) {
  return (
    <Link
      aria-label="rotpunkt Signature Startseite"
      className={`group inline-flex items-center gap-4 whitespace-nowrap text-ink ${className}`}
      href={href}
    >
      <span className="inline-flex items-center text-[1.375rem] font-label leading-none tracking-[-0.02em]">
        r
        <span className="mx-px inline-block size-[7px] rounded-pill bg-signature transition-transform duration-state ease-signature group-hover:scale-110" />
        tpunkt
      </span>
      {!compact && (
        <>
          <span aria-hidden="true" className="h-[18px] w-px bg-hairline" />
          <span className="text-[0.875rem] tracking-[0.02em] text-graphite">Signature</span>
        </>
      )}
    </Link>
  );
}
