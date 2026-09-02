import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentPropsWithRef, ReactNode } from "react";

export type PillVariant = "primary" | "secondary" | "ghost";

type CommonProps = {
  children: ReactNode;
  variant?: PillVariant;
  className?: string;
  /** Leading ornament: an icon or the play circle. */
  leading?: ReactNode;
};

type LinkPillProps = CommonProps & {
  href: string;
  external?: boolean;
  onClick?: undefined;
  type?: undefined;
  disabled?: undefined;
  "aria-label"?: string;
};

type ButtonPillProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

export type PillProps = LinkPillProps | ButtonPillProps;

const base =
  "inline-flex select-none items-center justify-center gap-2.5 whitespace-nowrap rounded-pill font-label text-nav leading-none transition-[background-color,color,border-color,transform,box-shadow] duration-state ease-signature active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

/**
 * Three action shapes, all pills:
 * primary — the one filled red action per view (48 px);
 * secondary — outlined white (44 px);
 * ghost — text only, fills on hover (44 px).
 */
export const pillVariant: Record<PillVariant, string> = {
  primary:
    "h-12 px-7 bg-signature text-ink shadow-action hover:bg-signature-hover active:bg-signature-pressed",
  secondary: "h-11 border border-ink px-5 text-ink hover:bg-ink/10 active:bg-ink/15",
  ghost: "h-11 px-5 text-ink hover:bg-ink/[.08] active:bg-ink/[.12]"
};

export function Pill(props: PillProps) {
  const { children, className = "", leading, variant = "primary" } = props;
  const classes = `${base} ${pillVariant[variant]} ${className}`;
  const content = (
    <>
      {leading}
      <span>{children}</span>
    </>
  );

  if (props.href !== undefined) {
    const { href, external, "aria-label": ariaLabel } = props;
    if (external) {
      return (
        <a aria-label={ariaLabel} className={classes} href={href} rel="noreferrer" target="_blank">
          {content}
        </a>
      );
    }
    return (
      <Link aria-label={ariaLabel} className={classes} href={href}>
        {content}
      </Link>
    );
  }

  const rest = { ...props } as Partial<ButtonPillProps>;
  delete rest.href;
  delete rest.variant;
  delete rest.leading;
  delete rest.className;
  delete rest.children;
  return (
    <button className={classes} type="button" {...rest}>
      {content}
    </button>
  );
}

/** A 44 px round secondary action: close, menu, camera. */
export function RoundButton({
  children,
  className = "",
  tone = "outline",
  ...rest
}: Omit<ComponentPropsWithRef<"button">, "className"> & {
  className?: string;
  tone?: "outline" | "quiet" | "glass";
}) {
  const tones = {
    outline: "border border-ink text-ink hover:bg-ink/10",
    quiet: "border border-hairline text-ink hover:border-ink",
    glass: "glass text-ink hover:bg-ink/[.14]"
  };
  return (
    <button
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-pill transition-[background-color,border-color,transform] duration-state ease-signature active:scale-[0.96] ${tones[tone]} ${className}`}
      type="button"
      {...rest}
    >
      {children}
    </button>
  );
}
