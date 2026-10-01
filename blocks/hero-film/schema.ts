import { defineField, defineType } from "sanity";
import { plainEmphasis } from "@/lib/emphasis";
import { anchorField, headlineField } from "@/sanity/schemaTypes/fields";

/** The opening of a page: a silent film, the brand line, and the first action. */
export const schema = defineType({
  name: "heroFilmBlock",
  title: "Film-Bühne",
  type: "object",
  fields: [
    defineField({ name: "eyebrow", title: "Zeile über der Überschrift", type: "string" }),
    headlineField(),
    defineField({ name: "summary", title: "Ein Satz dazu", type: "text", rows: 2 }),
    defineField({ name: "primaryCta", title: "Hauptaktion", type: "linkField" }),
    defineField({
      name: "filmButtonLabel",
      title: "Beschriftung „Film ansehen“",
      type: "string",
      description: "Spielt den Film im Vollbild ab. Leer: kein Knopf."
    }),
    defineField({
      name: "badge",
      title: "Hinweis unten rechts",
      type: "string",
      description: "Optional, nur auf großen Bildschirmen, z. B. „Gefertigt in Deutschland“."
    }),
    defineField({ name: "film", title: "Film", type: "videoLoop", validation: (Rule) => Rule.required() }),
    anchorField
  ],
  preview: {
    select: { headline: "headline", media: "film.poster" },
    prepare: ({ headline, media }) => ({
      title: "Film-Bühne",
      subtitle: headline ? plainEmphasis(headline) : "Noch keine Überschrift",
      media
    })
  }
});
