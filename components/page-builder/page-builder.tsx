import { blockComponents } from "@/blocks/registry";
import type { BlockProps, BlockType, PageBlock, PageDocument } from "@/blocks/types";
import type { Locale } from "@/lib/i18n";
import { BlockBoundary } from "./block-boundary";

type AnyBlockComponent = (props: BlockProps<BlockType> & { block: PageBlock }) => React.ReactNode;

/** Renders a page's Page Blocks, in the editor's order, through the block registry. */
export function PageBuilder({ page, locale }: { page: PageDocument; locale: Locale }) {
  return (
    <>
      {page.content?.map((block, index) => {
        const BlockComponent = blockComponents[block._type] as AnyBlockComponent | undefined;
        // A block type this build does not know: published content is ahead of the code.
        if (!BlockComponent) return null;
        return (
          <BlockBoundary blockType={block._type} key={block._key}>
            <BlockComponent block={block} index={index} locale={locale} />
          </BlockBoundary>
        );
      })}
    </>
  );
}
