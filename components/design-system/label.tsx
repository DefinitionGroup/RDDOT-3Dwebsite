import type { ReactNode } from "react";

type LabelProps = {
  children: ReactNode;
  as?: "p" | "span" | "div" | "dt" | "figcaption";
  className?: string;
  tone?: "graphite" | "ink";
};

/** The 11 px uppercase label that names every block and every field. */
export function Label({ as: Tag = "p", children, className = "", tone = "graphite" }: LabelProps) {
  return (
    <Tag
      className={`font-label text-label uppercase tracking-label ${
        tone === "ink" ? "text-ink" : "text-graphite"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

type SectionIntroProps = {
  label: string;
  title: ReactNode;
  className?: string;
  size?: "heading" | "heading-lg";
  align?: "left" | "center";
};

/** Label over headline — the head of every section. */
export function SectionIntro({
  align = "left",
  className = "",
  label,
  size = "heading",
  title
}: SectionIntroProps) {
  return (
    <div
      className={`flex flex-col gap-3.5 md:gap-5 ${
        align === "center" ? "items-center text-center" : ""
      } ${className}`}
    >
      <Label>{label}</Label>
      <h2 className={`m-0 text-balance ${size === "heading-lg" ? "text-heading-lg" : "text-heading"}`}>
        {title}
      </h2>
    </div>
  );
}
