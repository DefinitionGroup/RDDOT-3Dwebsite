import Link from "next/link";

type BrandLogoProps = {
  className?: string;
  /** Hides the "Signature" suffix on tight surfaces. */
  compact?: boolean;
  /**
   * Where the logo leads; `null` shows the lockup without a link, for a
   * screen whose header already has the home link.
   */
  href?: string | null;
  /** Read after the brand name by assistive technology: where the link leads. */
  label?: string;
};

/**
 * The wordmark: weight 500, the red dot as the o. Always white — every surface
 * is dark. The wordmark is one image named "rotpunkt", so the link's name
 * starts with what is on screen ("rotpunkt Signature Startseite") and voice
 * control finds it by the words a visitor reads.
 */
export function BrandLogo({ className = "", compact = false, href = "/", label = "Startseite" }: BrandLogoProps) {
  const classes = `group inline-flex items-center gap-4 whitespace-nowrap text-ink ${className}`;
  const lockup = (
    <>
      <span
        aria-label="rotpunkt"
        className="inline-flex items-center text-[1.375rem] font-label leading-none tracking-[-0.02em]"
        role="img"
      >
        r
        <span className="mx-px inline-block size-[7px] rounded-pill bg-signature transition-transform duration-state ease-signature group-hover:scale-110" />
        tpunkt
      </span>{" "}
      {compact ? (
        <span className="sr-only">Signature</span>
      ) : (
        <>
          <span aria-hidden="true" className="h-[18px] w-px bg-hairline" />
          <span className="text-[0.875rem] tracking-[0.02em] text-graphite">Signature</span>
        </>
      )}
    </>
  );

  if (href === null) return <span className={classes}>{lockup}</span>;
  return (
    <Link className={classes} href={href}>
      {lockup} <span className="sr-only">{label}</span>
    </Link>
  );
}
