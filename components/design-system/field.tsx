import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

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

/**
 * One choice from a short list, as a native select in the field's underline
 * style: phones open their own picker. The first option, `emptyLabel`, is no
 * answer and keeps the value "".
 */
export function ChoiceField<T extends string>({
  emptyLabel,
  label,
  onChange,
  options,
  value
}: {
  emptyLabel: string;
  label: string;
  onChange: (value: T | "") => void;
  options: Record<T, string>;
  value: T | "";
}) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <span className="relative block">
        <select
          className={`${fieldClass} h-14 cursor-pointer appearance-none pr-8 [color-scheme:dark] ${value === "" ? "text-graphite" : ""}`}
          id={id}
          onChange={(event) => onChange(event.target.value as T | "")}
          value={value}
        >
          <option value="">{emptyLabel}</option>
          {(Object.entries(options) as [T, string][]).map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[21px] right-0 size-3.5 text-graphite"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path d="M5 9l7 7 7-7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        </svg>
      </span>
    </div>
  );
}
