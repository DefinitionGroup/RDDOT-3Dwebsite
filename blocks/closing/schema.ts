import { defineField, defineType } from "sanity";
import { plainEmphasis } from "@/lib/emphasis";
import { anchorField, headlineField } from "@/sanity/schemaTypes/fields";

/** The close of a page: one centred sentence, a short paragraph, one action. */
export const schema = defineType({
  name: "closingBlock",
  title: "Abschluss",
  type: "object",
  fields: [
    headlineField(),
    defineField({ name: "body", title: "Text", type: "text", rows: 3 }),
    defineField({ name: "cta", title: "Aktion", type: "linkField" }),
    anchorField
  ],
  preview: {
    select: { headline: "headline" },
    prepare: ({ headline }) => ({ title: "Abschluss", subtitle: headline ? plainEmphasis(headline) : "" })
  }
});
