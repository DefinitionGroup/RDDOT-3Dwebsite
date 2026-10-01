import { defineCliConfig } from "sanity/cli";
import { dataset, studioProjectId } from "./sanity/env";

export default defineCliConfig({
  api: { projectId: studioProjectId, dataset },
  typegen: {
    path: [
      "./app/**/*.{ts,tsx}",
      "./blocks/**/*.{ts,tsx}",
      "./components/**/*.{ts,tsx}",
      "./content/**/*.ts",
      "./lib/**/*.{ts,tsx}",
      "./sanity/**/*.{ts,tsx}"
    ],
    schema: "./schema.json",
    generates: "./sanity.types.ts",
    overloadClientMethods: true
  }
});
