import { defineField, defineType } from "sanity";

/** A labelled link: a site path, an in-page anchor, or an external address. */
export const linkField = defineType({
  name: "linkField",
  title: "Link",
  type: "object",
  fields: [
    defineField({ name: "label", title: "Beschriftung", type: "string", validation: (Rule) => Rule.required() }),
    defineField({
      name: "href",
      title: "Ziel",
      type: "string",
      description: "/configure, #haltung, https://… oder mailto:…",
      validation: (Rule) =>
        Rule.required().custom((value) => {
          if (typeof value !== "string") return true;
          return /^(\/|#|https:\/\/|mailto:|tel:)/.test(value) || "Beginnt mit /, #, https://, mailto: oder tel:.";
        })
    })
  ],
  preview: { select: { title: "label", subtitle: "href" } }
});
