import { defineArrayMember, defineField, defineType } from "sanity";
import { plainEmphasis } from "@/lib/emphasis";
import { anchorField, headlineField } from "@/sanity/schemaTypes/fields";

/** A few promises as cards; each opens its longer story in a detail card. */
export const schema = defineType({
  name: "promisesBlock",
  title: "Versprechen",
  type: "object",
  fields: [
    defineField({ name: "label", title: "Bezeichnung", type: "string" }),
    headlineField({ rows: 2 }),
    defineField({ name: "intro", title: "Einleitung", type: "text", rows: 3 }),
    defineField({
      name: "items",
      title: "Versprechen",
      type: "array",
      of: [
        defineArrayMember({
          name: "promise",
          title: "Versprechen",
          type: "object",
          fields: [
            defineField({ name: "label", title: "Bezeichnung", type: "string", validation: (Rule) => Rule.required() }),
            defineField({ name: "title", title: "Titel", type: "string", validation: (Rule) => Rule.required() }),
            defineField({ name: "body", title: "Kurztext", type: "text", rows: 2, validation: (Rule) => Rule.required() }),
            defineField({
              name: "detail",
              title: "Ausführlich",
              type: "array",
              description: "Absätze der Detailkarte.",
              of: [defineArrayMember({ type: "text", rows: 4 })]
            })
          ],
          preview: { select: { title: "title", subtitle: "label" } }
        })
      ],
      validation: (Rule) => Rule.min(1).max(4).warning("Das Raster ist für bis zu vier Karten gebaut.")
    }),
    defineField({
      name: "detailCta",
      title: "Aktion in der Detailkarte",
      type: "linkField",
      description: "Steht in jeder Detailkarte unter dem Text."
    }),
    anchorField
  ],
  preview: {
    select: { headline: "headline" },
    prepare: ({ headline }) => ({ title: "Versprechen", subtitle: headline ? plainEmphasis(headline) : "" })
  }
});
