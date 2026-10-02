import { defineArrayMember, defineField, defineType } from "sanity";
import { LOCALE_TITLES, type Locale } from "@/lib/i18n";
import { languageField } from "../fields";

/**
 * Header and footer links for one language. One document per language,
 * linked like pages; a locale launches only with its navigation complete.
 */
export const navigation = defineType({
  name: "navigation",
  title: "Navigation",
  type: "document",
  fields: [
    languageField,
    defineField({
      name: "items",
      title: "Kopfzeile",
      type: "array",
      description: "Links oben auf großen Bildschirmen und im Menü auf Telefonen.",
      of: [
        defineArrayMember({
          name: "navItem",
          title: "Link",
          type: "object",
          fields: [
            defineField({ name: "label", title: "Beschriftung", type: "string", validation: (Rule) => Rule.required() }),
            defineField({
              name: "href",
              title: "Ziel",
              type: "string",
              description: "/konto, #haltung (Abschnitt der Startseite) oder https://…",
              validation: (Rule) => Rule.required()
            }),
            defineField({
              name: "quiet",
              title: "Zurückhaltend",
              type: "boolean",
              description: "In Grau statt Weiß, z. B. für „Mein Bereich“.",
              initialValue: false
            })
          ],
          preview: { select: { title: "label", subtitle: "href" } }
        })
      ],
      validation: (Rule) => Rule.max(6).warning("Mehr als sechs Links passen nicht in die Kopfzeile.")
    }),
    defineField({
      name: "cta",
      title: "Aktion in der Kopfzeile",
      type: "linkField",
      description: "Der Knopf rechts oben und unten im Telefon-Menü."
    }),
    defineField({
      name: "footerColumns",
      title: "Fußzeile",
      type: "array",
      of: [
        defineArrayMember({
          name: "footerColumn",
          title: "Spalte",
          type: "object",
          fields: [
            defineField({ name: "title", title: "Überschrift", type: "string", validation: (Rule) => Rule.required() }),
            defineField({ name: "links", title: "Links", type: "array", of: [defineArrayMember({ type: "linkField" })] })
          ],
          preview: { select: { title: "title" } }
        })
      ]
    }),
    defineField({ name: "footerNote", title: "Hinweis in der Fußzeile", type: "string" })
  ],
  preview: {
    select: { language: "language" },
    prepare: ({ language }) => ({
      title: "Navigation",
      subtitle: LOCALE_TITLES[language as Locale] ?? language
    })
  }
});
