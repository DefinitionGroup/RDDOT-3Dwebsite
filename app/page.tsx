import { SiteHeader } from "@/components/design-system/site-header";
import { CollectionCompare } from "@/components/sections/collection-compare";
import { MaterialRhythm } from "@/components/sections/material-rhythm";
import { ProductStory } from "@/components/sections/product-story";
import { SignatureHero } from "@/components/sections/signature-hero";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <SignatureHero />
        <ProductStory />
        <MaterialRhythm />
        <CollectionCompare />
      </main>
    </>
  );
}
