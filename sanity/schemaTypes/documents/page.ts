import { defineArrayMember, defineField, defineType } from "sanity";
import { blockTypeNames } from "@/blocks/schemas";
import { RESERVED_SEGMENTS } from "@/lib/i18n";
import { apiVersion } from "@/sanity/env";
import { languageField } from "../fields";

/** The published id of a document, whatever prefix it carries (`drafts.`, `versions.<release>.`). */
const publishedIdOf = (id: string | undefined) => id?.replace(/^(drafts\.|versions\.[^.]+\.)/, "") ?? "";

/**
 * Excludes every representation of the document being validated: published,
 * draft, and release versions. Spelled out with string functions because
 * `sanity::versionOf()` and computed `path()` silently matched nothing (DD).
 */
const NOT_SAME_DOCUMENT = `!(_id in [$publishedId, $draftId]) && !(string::startsWith(_id, "versions.") && array::join(string::split(_id, ".")[2..-1], ".") == $publishedId)`;

const reserved = new Set<string>(RESERVED_SEGMENTS);

/**
 * An Editorial Page: one locale, one address, ordered Page Blocks. Linked
 * translations are separate documents with their own slug, SEO and
 * publication state (ADR 0007).
 */
export const page = defineType({
  name: "page",
  title: "Seite",
  type: "document",
  groups: [
    { name: "content", title: "Inhalt", default: true },
    { name: "address", title: "Adresse" },
    { name: "seo", title: "SEO" }
  ],
  fields: [
    defineField({ name: "title", title: "Titel", type: "string", group: "content", validation: (Rule) => Rule.required() }),
    languageField,
    defineField({
      name: "isHomepage",
      title: "Startseite",
      type: "boolean",
      group: "address",
      initialValue: false,
      description: "Eine Startseite pro Sprache. Sie braucht keine Adresse.",
      validation: (Rule) =>
        Rule.custom(async (value, context) => {
          if (!value) return true;
          const id = publishedIdOf(context.document?._id);
          const count = await context.getClient({ apiVersion }).fetch<number>(
            `count(*[_type == "page" && language == $language && isHomepage == true && ${NOT_SAME_DOCUMENT}])`,
            { language: context.document?.language, publishedId: id, draftId: `drafts.${id}` }
          );
          return count === 0 || "In dieser Sprache gibt es schon eine Startseite.";
        })
    }),
    defineField({
      name: "slug",
      title: "Adresse",
      type: "slug",
      group: "address",
      description: "Der Teil der URL nach / (Deutsch), /en/ oder /es/. Wird beim Übersetzen nicht kopiert.",
      hidden: ({ document }) => Boolean(document?.isHomepage),
      options: {
        source: "title",
        documentInternationalization: { exclude: true },
        isUnique: async (value, context) => {
          const id = publishedIdOf(context.document?._id);
          const count = await context.getClient({ apiVersion }).fetch<number>(
            `count(*[_type == "page" && language == $language && slug.current == $slug && ${NOT_SAME_DOCUMENT}])`,
            { language: context.document?.language, slug: value, publishedId: id, draftId: `drafts.${id}` }
          );
          return count === 0;
        }
      },
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (context.document?.isHomepage) return true;
          const slug = value?.current;
          if (!slug) return "Eine Seite ohne Startseiten-Haken braucht eine Adresse.";
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "Nur Kleinbuchstaben, Ziffern und Bindestriche.";
          if (reserved.has(slug)) return `„${slug}“ ist für die Anwendung reserviert.`;
          return true;
        })
    }),
    defineField({ name: "seo", title: "SEO", type: "seo", group: "seo" }),
    defineField({
      name: "content",
      title: "Abschnitte",
      type: "array",
      group: "content",
      of: blockTypeNames.map((type) => defineArrayMember({ type })),
      options: { insertMenu: { views: [{ name: "list" }] } },
      validation: (Rule) => Rule.min(1).error("Eine Seite braucht mindestens einen Abschnitt.")
    })
  ],
  preview: {
    select: { title: "title", language: "language", isHomepage: "isHomepage", slug: "slug.current" },
    prepare: ({ title, language, isHomepage, slug }) => ({
      title,
      subtitle: `${language?.toUpperCase() ?? ""} · ${isHomepage ? "Startseite" : slug ? `/${slug}` : "ohne Adresse"}`
    })
  }
});
