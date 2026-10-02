import { defineArrayMember, defineField, defineType } from "sanity";
import { plainEmphasis } from "@/lib/emphasis";
import { anchorField, headlineField, imageField } from "@/sanity/schemaTypes/fields";

/** Product lines as large picture cards. */
export const schema = defineType({
  name: "collectionsBlock",
  title: "Linien",
  type: "object",
  fields: [
    defineField({ name: "label", title: "Bezeichnung", type: "string" }),
    headlineField(),
    defineField({
      name: "items",
      title: "Linien",
      type: "array",
      of: [
        defineArrayMember({
          name: "collection",
          title: "Linie",
          type: "object",
          fields: [
            defineField({ name: "title", title: "Name", type: "string", validation: (Rule) => Rule.required() }),
            defineField({ name: "subtitle", title: "Unterzeile", type: "string" }),
            defineField({ name: "body", title: "Text", type: "text", rows: 3 }),
            defineField({
              name: "link",
              title: "Link",
              type: "linkField",
              description: "Erscheint auf großen Bildschirmen auf der Karte."
            }),
            imageField({ name: "image", title: "Bild", required: true }),
            defineField({ name: "caption", title: "Hinweis auf dem Bild", type: "string" })
          ],
          preview: { select: { title: "title", subtitle: "subtitle", media: "image" } }
        })
      ],
      validation: (Rule) => Rule.min(1)
    }),
    anchorField
  ],
  preview: {
    select: { headline: "headline" },
    prepare: ({ headline }) => ({ title: "Linien", subtitle: headline ? plainEmphasis(headline) : "" })
  }
});
