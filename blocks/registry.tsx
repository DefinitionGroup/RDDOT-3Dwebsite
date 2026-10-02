/**
 * The component for every Page Block. The `satisfies` clause turns a schema
 * without a component into a build error rather than a hole on the page.
 */
import ClosingBlock from "./closing/Component";
import CollectionsBlock from "./collections/Component";
import ConfiguratorBlock from "./configurator/Component";
import HeroFilmBlock from "./hero-film/Component";
import MaterialsBlock from "./materials/Component";
import PromisesBlock from "./promises/Component";
import RoomStoryBlock from "./room-story/Component";
import StatementBlock from "./statement/Component";
import type { BlockComponent, BlockType } from "./types";

export const blockComponents = {
  heroFilmBlock: HeroFilmBlock,
  statementBlock: StatementBlock,
  promisesBlock: PromisesBlock,
  materialsBlock: MaterialsBlock,
  configuratorBlock: ConfiguratorBlock,
  roomStoryBlock: RoomStoryBlock,
  collectionsBlock: CollectionsBlock,
  closingBlock: ClosingBlock
} satisfies { [K in BlockType]: BlockComponent<K> };
