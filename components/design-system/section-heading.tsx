type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  align?: "left" | "center";
  className?: string;
};

/**
 * Renders headline text; a trailing full stop is set in signature red —
 * the rotpunkt dot punctuates every statement.
 */
export function RedStop({ text }: { text: string }) {
  if (!text.endsWith(".")) {
    return <>{text}</>;
  }
  return (
    <>
      {text.slice(0, -1)}
      <span className="text-signature">.</span>
    </>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  align = "left",
  className = ""
}: SectionHeadingProps) {
  return (
    <div className={`${align === "center" ? "mx-auto text-center" : ""} ${className}`}>
      {eyebrow && (
        <p className="mb-6 text-body uppercase tracking-[0.22em] text-graphite">{eyebrow}</p>
      )}
      <h2 className="text-balance text-display text-ink">
        <RedStop text={title} />
      </h2>
    </div>
  );
}
