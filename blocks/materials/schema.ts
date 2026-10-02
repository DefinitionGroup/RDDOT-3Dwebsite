import { defineArrayMember, defineField, defineType } from "sanity";
import { plainEmphasis } from "@/lib/emphasis";
import { anchorField, finishKeyField, headlineField, imageField, productKeyField } from "@/sanity/schemaTypes/fields";

/**
 * Front finishes as cards. Each card names a finish of the product by key;
 * the link into the configurator and the surcharge come from the configurator,
 * never from Sanity.
 */
export const schema = defineType({
  name: "materialsBlock",
  title: "Materialien",
  type: "object",
  fields: [
    productKeyField,
    defineField({ name: "label", title: "Bezeichnung", type: "string" }),
    headlineField(),
    defineField({ name: "intro", title: "Einleitung", type: "text", rows: 3 }),
    defineField({
      name: "items",
      title: "Materialien",
      type: "array",
      of: [
        defineArrayMember({
          name: "material",
          title: "Material",
          type: "object",
          fields: [
            finishKeyField({
              name: "finishKey",
              title: "Front im Konfigurator",
              kind: "front",
              description: "Die Karte öffnet den Konfigurator mit dieser Front und nennt ihren Aufpreis.",
              required: true
            }),
            defineField({ name: "name", title: "Name", type: "string", validation: (Rule) => Rule.required() }),
            defineField({ name: "kind", title: "Art", type: "string", description: "Z. B. Furnier, Fenix, Lack." }),
            defineField({ name: "body", title: "Kurztext", type: "string" }),
            imageField({ name: "image", title: "Bild", description: "Ein Foto der Oberfläche. Leer: die Farbe unten." }),
            defineField({
              name: "color",
              title: "Farbe statt Bild",
              type: "string",
              description: "Hexwert wie #F5F1EA, für Lacke ohne Foto.",
              validation: (Rule) =>
                Rule.regex(/^#[0-9a-fA-F]{6}$/, { name: "hex" }).custom((value, context) => {
                  const parent = context.parent as { image?: unknown } | undefined;
                  return value || parent?.image ? true : "Ein Bild oder eine Farbe ist nötig.";
                })
            }),
            defineField({
              name: "colorAlt",
              title: "Beschreibung der Farbe",
              type: "string",
              description: "Für Screenreader, wenn statt eines Bildes die Farbe steht.",
              hidden: ({ parent }) => Boolean(parent?.image)
            }),
            defineField({
              name: "zoom",
              title: "Bild vergrößern",
              type: "number",
              description: "Optional, 1 bis 2. Rückt eine Kante aus dem Bild, ohne es neu zuzuschneiden.",
              validation: (Rule) => Rule.min(1).max(2)
            }),
            defineField({
              name: "detail",
              title: "Ausführlich",
              type: "array",
              description: "Absätze der Detailkarte.",
              of: [defineArrayMember({ type: "text", rows: 4 })]
            }),
            defineField({
              name: "facts",
              title: "Eigenschaften",
              type: "array",
              of: [defineArrayMember({ type: "string" })],
              validation: (Rule) => Rule.max(4)
            })
          ],
          preview: { select: { title: "name", subtitle: "kind", media: "image" } }
        })
      ],
      validation: (Rule) => Rule.min(1)
    }),
    defineField({ name: "cta", title: "Aktion unter den Karten", type: "linkField" }),
    defineField({
      name: "detailCtaLabel",
      title: "Beschriftung in der Detailkarte",
      type: "string",
      description: "Öffnet den Konfigurator mit dieser Front, z. B. „In der Szene ansehen“."
    }),
    anchorField
  ],
  preview: {
    select: { headline: "headline" },
    prepare: ({ headline }) => ({ title: "Materialien", subtitle: headline ? plainEmphasis(headline) : "" })
  }
});
