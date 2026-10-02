import { defineArrayMember, defineField, defineType } from "sanity";
import { plainEmphasis } from "@/lib/emphasis";
import { anchorField, headlineField, imageField } from "@/sanity/schemaTypes/fields";

/** A picture of the result in a room, beside a short list of ways to see it. */
export const schema = defineType({
  name: "roomStoryBlock",
  title: "Raum & Ansichten",
  type: "object",
  fields: [
    defineField({ name: "label", title: "Bezeichnung", type: "string" }),
    headlineField(),
    defineField({ name: "lead", title: "Einleitung", type: "text", rows: 3 }),
    defineField({
      name: "features",
      title: "Liste",
      type: "array",
      of: [
        defineArrayMember({
          name: "roomFeature",
          title: "Eintrag",
          type: "object",
          fields: [
            defineField({ name: "label", title: "Bezeichnung", type: "string", validation: (Rule) => Rule.required() }),
            defineField({ name: "title", title: "Titel", type: "string", validation: (Rule) => Rule.required() }),
            defineField({ name: "body", title: "Text", type: "text", rows: 2 })
          ],
          preview: { select: { title: "title", subtitle: "label" } }
        })
      ]
    }),
    defineField({ name: "cta", title: "Aktion", type: "linkField" }),
    imageField({ name: "image", title: "Bild", required: true }),
    defineField({
      name: "imageBadge",
      title: "Hinweis auf dem Bild",
      type: "string",
      description: "Optional, oben links auf dem Bild, z. B. der Name der Szene."
    }),
    defineField({ name: "caption", title: "Bildunterschrift", type: "string" }),
    anchorField
  ],
  preview: {
    select: { headline: "headline", media: "image" },
    prepare: ({ headline, media }) => ({
      title: "Raum & Ansichten",
      subtitle: headline ? plainEmphasis(headline) : "",
      media
    })
  }
});
