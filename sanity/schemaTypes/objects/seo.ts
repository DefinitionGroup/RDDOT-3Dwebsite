import { defineField, defineType } from "sanity";

/** Search and sharing inputs. Code owns canonical, hreflang and robots output. */
export const seo = defineType({
  name: "seo",
  title: "SEO",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Seitentitel",
      type: "string",
      description: "Im Browser-Tab und in Suchergebnissen. Leer: der Titel der Seite.",
      validation: (Rule) => Rule.max(70).warning("Suchmaschinen kürzen nach etwa 60–70 Zeichen.")
    }),
    defineField({
      name: "description",
      title: "Beschreibung",
      type: "text",
      rows: 3,
      validation: (Rule) => Rule.max(170).warning("Suchmaschinen kürzen nach etwa 155–160 Zeichen.")
    }),
    defineField({
      name: "image",
      title: "Vorschaubild zum Teilen",
      type: "image",
      description: "1200 × 630 px. Leer: das Bild aus den Website-Einstellungen."
    })
  ]
});
