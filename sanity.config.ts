"use client";

import { documentInternationalization } from "@sanity/document-internationalization";
import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { DEFAULT_LOCALE, sanityLanguages } from "./lib/i18n";
import { apiVersion, dataset, studioProjectId } from "./sanity/env";
import { schemaTypes } from "./sanity/schemaTypes";

export default defineConfig({
  name: "rotpunkt-signature",
  title: "rotpunkt Signature",
  basePath: "/studio",
  projectId: studioProjectId,
  dataset,
  schema: {
    types: schemaTypes,
    // Every new page starts with a language; the plain template would leave it empty.
    templates: (previous) => [
      ...previous.filter((template) => template.id !== "page"),
      {
        id: "page-by-language",
        title: "Seite",
        schemaType: "page",
        parameters: [{ name: "language", type: "string" }],
        value: (params: { language?: string }) => ({ language: params?.language ?? DEFAULT_LOCALE })
      }
    ]
  },
  plugins: [
    structureTool(),
    documentInternationalization({
      supportedLanguages: sanityLanguages,
      schemaTypes: ["page", "navigation"],
      languageField: "language"
    }),
    visionTool({ defaultApiVersion: apiVersion })
  ]
});
