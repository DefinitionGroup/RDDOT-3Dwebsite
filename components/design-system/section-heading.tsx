type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className = ""
}: SectionHeadingProps) {
  return (
    <div className={`${align === "center" ? "mx-auto text-center" : ""} ${className}`}>
      {eyebrow && (
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-ember">
          {eyebrow}
        </p>
      )}
      <h2 className="text-balance font-brand text-[2.75rem] font-medium leading-[1.05] text-graphite md:text-[3.4rem]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 max-w-[26rem] text-balance font-brand text-[2.1rem] font-medium leading-[1.08] text-ash md:text-[3.1rem]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
