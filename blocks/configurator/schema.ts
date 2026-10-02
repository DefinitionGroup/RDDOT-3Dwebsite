import { defineArrayMember, defineField, defineType } from "sanity";
import { plainEmphasis } from "@/lib/emphasis";
import {
  anchorField,
  finishKeyField,
  headlineField,
  imageField,
  productKeyField
} from "@/sanity/schemaTypes/fields";

const stepFields = [
  defineField({ name: "label", title: "Bezeichnung", type: "string", validation: (Rule) => Rule.required() }),
  defineField({ name: "title", title: "Titel", type: "string", validation: (Rule) => Rule.required() }),
  defineField({ name: "body", title: "Text", type: "text", rows: 2 })
];

/**
 * The configurator as a smart Page Block: editorial presentation plus a
 * stable `productKey` and, optionally, the finishes it starts with. The
 * application resolves the product, its price and the link (CONTEXT.md,
 * Configurator Block); rules, prices and assets never live here.
 */
export const schema = defineType({
  name: "configuratorBlock",
  title: "Konfigurator",
  type: "object",
  groups: [
    { name: "content", title: "Inhalt", default: true },
    { name: "start", title: "Startzustand" },
    { name: "explainer", title: "Erklärung" }
  ],
  fields: [
    { ...productKeyField, group: "start" },
    {
      ...finishKeyField({
        name: "startFront",
        title: "Front zum Start",
        kind: "front",
        description: "Optional. Leer: die Grundausstattung."
      }),
      group: "start"
    },
    {
      ...finishKeyField({
        name: "startCabinet",
        title: "Korpus zum Start",
        kind: "cabinet",
        description: "Optional. Leer: die Grundausstattung."
      }),
      group: "start"
    },
    defineField({ name: "label", title: "Bezeichnung", type: "string", group: "content" }),
    { ...headlineField({ rows: 2 }), group: "content" },
    defineField({ name: "body", title: "Text", type: "text", rows: 4, group: "content" }),
    defineField({
      name: "counterBefore",
      title: "Zähler: Text davor",
      type: "string",
      group: "content",
      description: "Zeile mit dem Zähler bis 100 °C, z. B. „Von 0 auf“. Beide Felder leer: keine Zeile."
    }),
    defineField({ name: "counterAfter", title: "Zähler: Text danach", type: "string", group: "content" }),
    { ...imageField({ name: "image", title: "Bild der Szene", required: true }), group: "content" },
    defineField({
      name: "stages",
      title: "Schritte im Bild",
      type: "array",
      group: "content",
      description: "Wechseln sich über dem Bild ab, bis jemand sie antippt.",
      of: [defineArrayMember({ name: "stage", title: "Schritt", type: "object", fields: stepFields })],
      validation: (Rule) => Rule.min(2).max(4)
    }),
    defineField({ name: "ctaLabel", title: "Beschriftung der Hauptaktion", type: "string", group: "content" }),
    defineField({
      name: "explainerLabel",
      title: "Beschriftung „So funktioniert es“",
      type: "string",
      group: "explainer",
      description: "Öffnet die Erklärung. Leer: keine Erklärung."
    }),
    {
      ...headlineField({ name: "explainerTitle", title: "Überschrift der Erklärung", required: false }),
      group: "explainer"
    },
    defineField({ name: "explainerIntro", title: "Einleitung der Erklärung", type: "text", rows: 3, group: "explainer" }),
    defineField({
      name: "steps",
      title: "Schritte der Erklärung",
      type: "array",
      group: "explainer",
      of: [defineArrayMember({ name: "step", title: "Schritt", type: "object", fields: stepFields })]
    }),
    { ...anchorField, group: "content" }
  ],
  preview: {
    select: { headline: "headline", media: "image" },
    prepare: ({ headline, media }) => ({
      title: "Konfigurator",
      subtitle: headline ? plainEmphasis(headline) : "",
      media
    })
  }
});
