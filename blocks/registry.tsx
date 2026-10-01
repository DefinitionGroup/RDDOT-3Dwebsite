/**
 * The component for every Page Block. The `satisfies` clause turns a schema
 * without a component into a build error rather than a hole on the page.
 */
import HeroFilmBlock from "./hero-film/Component";
import StatementBlock from "./statement/Component";
import type { BlockComponent, BlockType } from "./types";

export const blockComponents = {
  heroFilmBlock: HeroFilmBlock,
  statementBlock: StatementBlock
} satisfies { [K in BlockType]: BlockComponent<K> };
