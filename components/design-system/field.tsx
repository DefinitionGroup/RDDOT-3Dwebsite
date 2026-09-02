import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

/** The one input: an underline that turns white on focus. */
export const fieldClass =
  "mt-3 w-full border-0 border-b border-hairline bg-transparent px-0 text-lead text-ink outline-none transition-colors duration-state ease-signature placeholder:text-ash focus:border-ink focus-visible:outline-none";

export function FieldLabel({
  children,
  htmlFor,
  hint
}: {
  children: ReactNode;
  htmlFor: string;
  hint?: string;
}) {
  return (
    <label
      className="block font-label text-label uppercase tracking-label text-graphite"
      htmlFor={htmlFor}
    >
      {children}
      {hint && <span className="ml-2 normal-case tracking-normal text-ash">{hint}</span>}
    </label>
  );
}

export function TextField({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return <input className={`${fieldClass} h-14 ${className}`} {...props} />;
}

export function TextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }) {
  return <textarea className={`${fieldClass} min-h-32 py-2 ${className}`} {...props} />;
}
