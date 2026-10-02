import { draftMode } from "next/headers";
import { createDataAttribute, stegaClean } from "next-sanity";
import { blockComponents } from "@/blocks/registry";
import type { BlockProps, BlockType, PageBlock, PageDocument } from "@/blocks/types";
import type { Locale } from "@/lib/i18n";
import { dataset, studioProjectId } from "@/sanity/env";
import { BlockBoundary } from "./block-boundary";

type AnyBlockComponent = (props: BlockProps<BlockType> & { block: PageBlock }) => React.ReactNode;

/**
 * Renders a page's Page Blocks, in the editor's order, through the block
 * registry. In Editorial Preview each block is wrapped with the address of
 * its array item, which gives the Presentation tool click-to-select and
 * drag-to-reorder; public pages render the blocks unwrapped.
 */
export async function PageBuilder({ page, locale }: { page: PageDocument; locale: Locale }) {
  const { isEnabled: isPreview } = await draftMode();
  const attribute = isPreview
    ? createDataAttribute({ id: page._id, type: "page", path: "content", projectId: studioProjectId, dataset, baseUrl: "/studio" })
    : null;

  return (
    <>
      {page.content?.map((block, index) => {
        const BlockComponent = blockComponents[block._type] as AnyBlockComponent | undefined;
        // A block type this build does not know: published content is ahead of the code.
        if (!BlockComponent) return null;
        // In preview, strings carry invisible stega markers; an anchor is logic, not copy.
        const rendered = (
          <BlockBoundary blockType={block._type} key={block._key}>
            <BlockComponent block={{ ...block, anchor: stegaClean(block.anchor) }} index={index} locale={locale} />
          </BlockBoundary>
        );
        return attribute ? (
          <div data-sanity={attribute(`[_key=="${block._key}"]`).toString()} key={block._key}>
            {rendered}
          </div>
        ) : (
          rendered
        );
      })}
    </>
  );
}
