import { defineField, defineType } from "sanity";

/** A silent background loop: one file for large screens, an optional smaller one for phones. */
export const videoLoop = defineType({
  name: "videoLoop",
  title: "Film",
  type: "object",
  fields: [
    defineField({
      name: "desktop",
      title: "Film",
      type: "file",
      description: "MP4 (H.264), ohne Ton, etwa 1920 × 1080. Wird stumm in Schleife abgespielt.",
      options: { accept: "video/mp4" },
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: "mobile",
      title: "Film für Telefone",
      type: "file",
      description: "Optional, etwa 1280 × 720. Leer: der große Film auch auf Telefonen.",
      options: { accept: "video/mp4" }
    }),
    defineField({
      name: "poster",
      title: "Standbild",
      type: "image",
      description: "Ein Bild aus dem Film. Steht da, bis der Film läuft, und für alle, die weniger Bewegung wünschen.",
      validation: (Rule) => Rule.required()
    })
  ]
});
