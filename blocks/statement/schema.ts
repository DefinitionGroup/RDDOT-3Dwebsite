import { defineArrayMember, defineField, defineType } from "sanity";
import { plainEmphasis } from "@/lib/emphasis";
import { anchorField, headlineField, imageField } from "@/sanity/schemaTypes/fields";

/** A stance in one sentence that lights up word by word as it is read, beside a picture. */
export const schema = defineType({
  name: "statementBlock",
  title: "Haltung",
  type: "object",
  fields: [
    defineField({ name: "label", title: "Bezeichnung", type: "string", description: "Die kleine Zeile über der Aussage." }),
    headlineField({ name: "statement", title: "Aussage", rows: 3 }),
    defineField({
      name: "paragraphs",
      title: "Absätze",
      type: "array",
      of: [defineArrayMember({ type: "text", rows: 4 })]
    }),
    defineField({ name: "link", title: "Link", type: "linkField" }),
    imageField({ name: "image", title: "Bild", required: true }),
    defineField({ name: "caption", title: "Bildunterschrift", type: "string" }),
    anchorField
  ],
  preview: {
    select: { statement: "statement", media: "image" },
    prepare: ({ statement, media }) => ({
      title: "Haltung",
      subtitle: statement ? plainEmphasis(statement) : "Noch keine Aussage",
      media
    })
  }
});
