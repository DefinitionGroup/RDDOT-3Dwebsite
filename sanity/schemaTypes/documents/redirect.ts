import { defineField, defineType } from "sanity";
import { redirectSourceProblem, redirectTargetProblem } from "@/lib/redirects";
import { apiVersion } from "@/sanity/env";

/**
 * An old address that leads to a new one, enforced by proxy.ts before any
 * page renders. Needed whenever a published slug changes, so links and search
 * results keep working.
 */
export const redirect = defineType({
  name: "redirect",
  title: "Weiterleitung",
  type: "document",
  fields: [
    defineField({
      name: "from",
      title: "Von",
      type: "string",
      description: "Die alte Adresse ohne Domain: /alte-seite oder /en/old-page. Deutsche Adressen ohne /de.",
      validation: (Rule) =>
        Rule.required().custom(async (value, context) => {
          if (typeof value !== "string") return true;
          const problem = redirectSourceProblem(value);
          if (problem) return problem;
          const id = context.document?._id.replace(/^drafts\./, "") ?? "";
          const taken = await context
            .getClient({ apiVersion })
            .fetch<number>(
              `count(*[_type == "redirect" && lower(from) == lower($from) && !(_id in [$id, "drafts." + $id])])`,
              { from: value, id }
            );
          return taken === 0 || "Für diese Adresse gibt es schon eine Weiterleitung.";
        })
    }),
    defineField({
      name: "to",
      title: "Nach",
      type: "string",
      description: "Die neue Adresse: /neue-seite, /en/new-page oder https://…",
      validation: (Rule) =>
        Rule.required().custom((value, context) => {
          if (typeof value !== "string") return true;
          return redirectTargetProblem(value, (context.document?.from as string | undefined) ?? null) ?? true;
        })
    }),
    defineField({
      name: "permanent",
      title: "Dauerhaft",
      type: "boolean",
      description: "An: die alte Adresse ist für immer ersetzt (308). Aus: nur vorübergehend (307).",
      initialValue: true
    })
  ],
  preview: {
    select: { from: "from", to: "to", permanent: "permanent" },
    prepare: ({ from, to, permanent }) => ({
      title: from ?? "Neue Weiterleitung",
      subtitle: `→ ${to ?? "…"}${permanent === false ? " · vorübergehend" : ""}`
    })
  }
});
