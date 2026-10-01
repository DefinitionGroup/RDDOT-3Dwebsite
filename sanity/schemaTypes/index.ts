import type { SchemaTypeDefinition } from "sanity";
import { blockSchemas } from "@/blocks/schemas";
import { page } from "./documents/page";
import { linkField } from "./objects/link-field";
import { seo } from "./objects/seo";
import { videoLoop } from "./objects/video-loop";

export const schemaTypes: SchemaTypeDefinition[] = [page, linkField, seo, videoLoop, ...blockSchemas];
