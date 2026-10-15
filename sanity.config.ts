"use client";

import { documentInternationalization } from "@sanity/document-internationalization";
import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { internationalizedArray } from "sanity-plugin-internationalized-array";
import { presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";
import { sanityLanguages } from "./lib/i18n";
import { apiVersion, dataset, studioProjectId } from "./sanity/env";
import { resolve } from "./sanity/presentation/resolve";
import { schemaTypes } from "./sanity/schemaTypes";
import { structure } from "./sanity/structure";

/** Documents that exist exactly once (per language): opened from the structure, never duplicated or deleted. */
const FIXED_TYPES = new Set(["navigation", "siteSettings"]);

export default defineConfig({
  name: "rotpunkt-signature",
  title: "rotpunkt Signature",
  basePath: "/studio",
  projectId: studioProjectId,
  dataset,
  schema: {
    types: schemaTypes,
    templates: (previous) => [
      // A page always starts in a language (the plugin adds page-de, page-en, page-es);
      // navigation and the settings are fixed documents, opened from the structure.
      ...previous.filter((template) => template.id !== "page" && !FIXED_TYPES.has(template.schemaType)),
      {
        id: "navigation-by-language",
        title: "Navigation",
        schemaType: "navigation",
        parameters: [{ name: "language", type: "string" }],
        value: (params: { language: string }) => ({ language: params.language })
      }
    ]
  },
  document: {
    actions: (previous, context) =>
      FIXED_TYPES.has(context.schemaType)
        ? previous.filter(({ action }) => action !== "duplicate" && action !== "delete")
        : previous
  },
  plugins: [
    // Editorial Preview: the site in an iframe, drafts streamed in, click-to-edit.
    presentationTool({
      resolve,
      previewUrl: {
        initial: "/",
        previewMode: { enable: "/api/draft-mode/enable", disable: "/api/draft-mode/disable" }
      }
    }),
    structureTool({ structure }),
    documentInternationalization({
      supportedLanguages: sanityLanguages,
      schemaTypes: ["page"],
      languageField: "language"
    }),
    // Field-level localization for the small shared labels in siteSettings.
    internationalizedArray({
      languages: sanityLanguages,
      fieldTypes: ["string", "text"],
      buttonAddAll: true
    }),
    visionTool({ defaultApiVersion: apiVersion })
  ]
});
