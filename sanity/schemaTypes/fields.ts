import { defineField, type ImageRule, type StringRule } from "sanity";
import {
  cabinetFinishChoices,
  frontFinishChoices,
  productChoices,
  resolveProduct
} from "@/features/configurator/catalog";
import { countEmphasis } from "@/lib/emphasis";
import { LOCALE_TITLES, LOCALES } from "@/lib/i18n";

/**
 * The language field @sanity/document-internationalization requires. The list
 * makes TypeGen emit the locale union instead of `string`.
 */
export const languageField = defineField({
  name: "language",
  title: "Sprache",
  type: "string",
  readOnly: true,
  hidden: true,
  options: { list: LOCALES.map((id) => ({ title: LOCALE_TITLES[id], value: id })) },
  validation: (Rule) => Rule.required()
});

/** A headline whose one serif word is marked with asterisks: `Küchen, auf den *Punkt*.` */
export function headlineField(
  options: { name?: string; title?: string; rows?: number; required?: boolean } = {}
) {
  return defineField({
    name: options.name ?? "headline",
    title: options.title ?? "Überschrift",
    type: options.rows ? "text" : "string",
    ...(options.rows ? { rows: options.rows } : {}),
    description:
      "Das eine Wort in der Serifenschrift steht zwischen Sternchen: Küchen, auf den *Punkt*." +
      (options.rows ? " Ein Zeilenumbruch gilt nur auf großen Bildschirmen." : ""),
    validation: (Rule) =>
      (options.required === false ? Rule : Rule.required()).custom((value) => {
        if (typeof value !== "string") return true;
        if ((value.match(/\*/g)?.length ?? 0) % 2 === 1) return "Ein Sternchen ist nicht geschlossen.";
        return countEmphasis(value) <= 1 || "Höchstens ein Wort in der Serifenschrift.";
      })
  });
}

/** An editorial image with its own alternative text and an editable focal point. */
export function imageField(options: { name: string; title: string; description?: string; required?: boolean }) {
  return defineField({
    name: options.name,
    title: options.title,
    type: "image",
    description: options.description,
    options: { hotspot: true },
    fields: [
      defineField({
        name: "alt",
        title: "Alternativtext",
        type: "string",
        description: "Was auf dem Bild zu sehen ist, für Screenreader und Suchmaschinen.",
        validation: (Rule) => Rule.required()
      })
    ],
    ...(options.required ? { validation: (Rule: ImageRule) => Rule.required() } : {})
  });
}

/**
 * The product a Configurator Block names. The choices come from the
 * configurator's own catalog, so an editor cannot pick a product it does not
 * know; rules, options and prices never live in Sanity (ADR 0007).
 */
export const productKeyField = defineField({
  name: "productKey",
  title: "Produkt",
  type: "string",
  options: { list: productChoices() },
  initialValue: productChoices()[0]?.value,
  validation: (Rule) =>
    Rule.required().custom((value) =>
      typeof value !== "string" || resolveProduct(value) ? true : "Dieses Produkt kennt der Konfigurator nicht."
    )
});

/** A front or cabinet finish of the configurator, chosen by its key. */
export function finishKeyField(options: { name: string; title: string; kind: "front" | "cabinet"; description?: string; required?: boolean }) {
  const choices = options.kind === "front" ? frontFinishChoices() : cabinetFinishChoices();
  return defineField({
    name: options.name,
    title: options.title,
    type: "string",
    description: options.description,
    options: { list: choices },
    ...(options.required ? { validation: (Rule: StringRule) => Rule.required() } : {})
  });
}

/** In-page anchor (`#haltung`) that navigation links can jump to. */
export const anchorField = defineField({
  name: "anchor",
  title: "Sprungmarke",
  type: "string",
  description: "Optional. Kleinbuchstaben und Bindestriche, z. B. haltung — erreichbar als #haltung.",
  validation: (Rule) =>
    Rule.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { name: "anchor" }).error("Nur Kleinbuchstaben, Ziffern und Bindestriche.")
});
