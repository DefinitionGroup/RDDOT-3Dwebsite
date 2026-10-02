/**
 * The ONLY list of Page Blocks. The schema index, the page's content array,
 * the registry check, the demo content and the seed all derive from here.
 * Adding a block: blocks/<name>/{schema.ts, Component.tsx, demo.ts}, one line
 * here, one line in registry.tsx, then `pnpm typegen`. See blocks/CONTRACT.md.
 */
import { schema as closingBlock } from "./closing/schema";
import { schema as collectionsBlock } from "./collections/schema";
import { schema as configuratorBlock } from "./configurator/schema";
import { schema as heroFilmBlock } from "./hero-film/schema";
import { schema as materialsBlock } from "./materials/schema";
import { schema as promisesBlock } from "./promises/schema";
import { schema as roomStoryBlock } from "./room-story/schema";
import { schema as statementBlock } from "./statement/schema";

export const blockSchemas = [
  heroFilmBlock,
  statementBlock,
  promisesBlock,
  materialsBlock,
  configuratorBlock,
  roomStoryBlock,
  collectionsBlock,
  closingBlock
];

export const blockTypeNames = blockSchemas.map((schema) => schema.name);
