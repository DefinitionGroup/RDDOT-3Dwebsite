/**
 * The ONLY list of Page Blocks. The schema index, the page's content array,
 * the registry check, the demo content and the seed all derive from here.
 * Adding a block: blocks/<name>/{schema.ts, Component.tsx, demo.ts}, one line
 * here, one line in registry.tsx, then `pnpm typegen`. See blocks/CONTRACT.md.
 */
import { schema as heroFilmBlock } from "./hero-film/schema";
import { schema as statementBlock } from "./statement/schema";

export const blockSchemas = [heroFilmBlock, statementBlock];

export const blockTypeNames = blockSchemas.map((schema) => schema.name);
