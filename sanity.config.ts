"use client";

import { documentInternationalization } from "@sanity/document-internationalization";
import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { presentationTool } from "sanity/presentation";
import { structureTool } from "sanity/structure";
import { sanityLanguages } from "./lib/i18n";
import { apiVersion, dataset, studioProjectId } from "./sanity/env";
import { resolve } from "./sanity/presentation/resolve";
import { schemaTypes } from "./sanity/schemaTypes";
import { structure } from "./sanity/structure";

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
      // navigation is one fixed document per language, opened from the structure.
      ...previous.filter((template) => template.id !== "page" && template.schemaType !== "navigation"),
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
    // Navigation documents exist once per language and are not duplicated or deleted from here.
    actions: (previous, context) =>
      context.schemaType === "navigation"
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
    visionTool({ defaultApiVersion: apiVersion })
  ]
});
