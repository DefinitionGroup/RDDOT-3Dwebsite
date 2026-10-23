import type { ContactDetails } from "@/features/quote-requests/quote-request-contract";
import type { Locale } from "@/lib/i18n";

type Addressee = Pick<ContactDetails, "salutation" | "title"> & { name: string };

/**
 * The opening of an email or an offer letter, for when they exist: "Sehr
 * geehrte Frau Dr. Vogel" with a known salutation, "Guten Tag Alex Vogel" for
 * divers or no answer, a plain "Guten Tag" without a name. Spanish leaves the
 * title out next to Sra./Sr., where it would need its own gendered form.
 */
export function formalGreeting({ name, salutation, title }: Addressee, locale: Locale) {
  const fullName = name.trim().replace(/\s+/g, " ");
  const lastName = fullName.split(" ").at(-1) ?? "";
  const titled = (rest: string) => [title.trim(), rest].filter(Boolean).join(" ");

  switch (locale) {
    case "de":
      if (!fullName) return "Guten Tag";
      if (salutation === "frau") return `Sehr geehrte Frau ${titled(lastName)}`;
      if (salutation === "herr") return `Sehr geehrter Herr ${titled(lastName)}`;
      return `Guten Tag ${titled(fullName)}`;
    case "en":
      if (!fullName) return "Hello";
      if (title.trim() && (salutation === "frau" || salutation === "herr")) return `Dear ${titled(lastName)}`;
      if (salutation === "frau") return `Dear Ms ${lastName}`;
      if (salutation === "herr") return `Dear Mr ${lastName}`;
      return `Dear ${titled(fullName)}`;
    case "es":
      if (!fullName) return "Hola";
      if (salutation === "frau") return `Estimada Sra. ${lastName}`;
      if (salutation === "herr") return `Estimado Sr. ${lastName}`;
      return `Hola, ${titled(fullName)}`;
  }
}
