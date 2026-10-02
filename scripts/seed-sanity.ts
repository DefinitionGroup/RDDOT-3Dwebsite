/**
 * Writes the demo content (content/demo.ts) into a Sanity dataset.
 *
 *   pnpm sanity:seed                  upload assets, add missing pages, navigation and
 *                                     translation links, verify
 *   pnpm sanity:seed --replace        also overwrite documents that already exist
 *   pnpm sanity:seed --dry-run        print what would be written, touch nothing
 *
 * Runs through `sanity exec --with-user-token`, so it writes as whoever the
 * CLI is authenticated as: a `sanity login`, or SANITY_AUTH_TOKEN for a
 * project token. The project and dataset come from sanity.cli.ts
 * (NEXT_PUBLIC_SANITY_PROJECT_ID / NEXT_PUBLIC_SANITY_DATASET).
 *
 * The demo content is in the shape the queries *return*; this inverts it to
 * the stored shape: local files under /public become uploaded assets and
 * references, computed fields are dropped, and pages of one translation group
 * get a translation.metadata document linking them. Ids are deterministic and
 * assets deduplicate by content. Documents that already exist are kept, since
 * editors may have changed them; --replace overwrites them deliberately.
 * Afterwards it reads everything back through the site's own queries: what it
 * wrote must match the demo content; a kept document that differs is reported.
 */
import { createReadStream, existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { getCliClient } from "sanity/cli";
import { demoChrome, demoPages, translationGroup } from "../content/demo";
import { LOCALES } from "../lib/i18n";
import { apiVersion } from "../sanity/env";
import { HOME_PAGE_QUERY, NAVIGATION_QUERY, PAGE_QUERY } from "../sanity/lib/queries";

const dryRun = process.argv.includes("--dry-run");
const allowProduction = process.argv.includes("--allow-production");
const replace = process.argv.includes("--replace");
const client = getCliClient({ apiVersion });

type AnyObject = Record<string, unknown>;
type StoredDocument = AnyObject & { _id: string; _type: string };

const isObject = (value: unknown): value is AnyObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const reference = (id: string) => ({ _type: "reference", _ref: id });

/* ------------------------------------------------------------- assets */

/** A projected image whose asset is a demo file under /public. */
function demoImageUrl(node: AnyObject) {
  const asset = node.asset;
  return isObject(asset) && typeof asset._id === "string" && asset._id.startsWith("demo-image-")
    ? (asset.url as string)
    : null;
}

/** A projected file (`{ _id, url, mimeType }`) that is a demo file under /public. */
function demoFileUrl(node: AnyObject) {
  return typeof node._id === "string" && node._id.startsWith("demo-file-") && typeof node.url === "string"
    ? node.url
    : null;
}

function collectAssets(node: unknown, images: Set<string>, files: Set<string>) {
  if (Array.isArray(node)) return node.forEach((child) => collectAssets(child, images, files));
  if (!isObject(node)) return;
  const image = demoImageUrl(node);
  if (image) images.add(image);
  const file = demoFileUrl(node);
  if (file) files.add(file);
  Object.values(node).forEach((child) => collectAssets(child, images, files));
}

async function upload(kind: "image" | "file", url: string) {
  const path = resolve(process.cwd(), "public", url.replace(/^\//, ""));
  if (!existsSync(path)) throw new Error(`Missing local file for ${url}: ${path}`);
  if (dryRun) return `${kind}-dry-run-${basename(path)}`;
  const asset = await client.assets.upload(kind, createReadStream(path), {
    filename: basename(path),
    ...(kind === "file" ? { contentType: "video/mp4" } : {})
  });
  console.log(`asset   ${url} → ${asset._id}`);
  return asset._id;
}

/* ---------------------------------------------------------- documents */

/** Resolved query shape → stored shape: assets become references, nulls disappear. */
function toStored(node: unknown, assetIds: Map<string, string>): unknown {
  if (Array.isArray(node)) {
    return node.map((child) => toStored(child, assetIds)).filter((child) => child !== undefined && child !== null);
  }
  if (!isObject(node)) return node;

  const imageUrl = demoImageUrl(node);
  if (imageUrl) {
    const { asset: _asset, ...rest } = node;
    void _asset;
    return { ...(toStored(rest, assetIds) as AnyObject), _type: "image", asset: reference(assetIds.get(imageUrl)!) };
  }
  const fileUrl = demoFileUrl(node);
  if (fileUrl) return { _type: "file", asset: reference(assetIds.get(fileUrl)!) };

  const stored: AnyObject = {};
  for (const [key, value] of Object.entries(node)) {
    if (value === null || value === undefined) continue;
    stored[key] = toStored(value, assetIds);
  }
  return stored;
}

const pageId = (page: (typeof demoPages)[number]) => `page-${page.language}-${translationGroup(page)}`;

/** One translation.metadata per group of pages in more than one language, as the plugin writes it. */
function translationDocuments(): StoredDocument[] {
  const groups = new Map<string, typeof demoPages>();
  for (const page of demoPages) groups.set(translationGroup(page), [...(groups.get(translationGroup(page)) ?? []), page]);
  return [...groups].flatMap(([group, pages]) =>
    pages.length < 2
      ? []
      : [
          {
            _id: `translation-metadata-page-${group}`,
            _type: "translation.metadata",
            schemaTypes: ["page"],
            translations: pages.map((page) => ({
              _key: page.language,
              _type: "internationalizedArrayReferenceValue",
              language: page.language,
              value: reference(pageId(page))
            }))
          }
        ]
  );
}

function pageDocuments(assetIds: Map<string, string>): StoredDocument[] {
  return demoPages.map((page) => ({
    _id: pageId(page),
    _type: "page",
    title: page.title,
    language: page.language,
    isHomepage: page.isHomepage ?? false,
    ...(page.slug ? { slug: { _type: "slug", current: page.slug } } : {}),
    ...(page.seo ? { seo: toStored({ _type: "seo", ...page.seo }, assetIds) } : {}),
    content: toStored(page.content ?? [], assetIds)
  }));
}

function navigationDocuments(): StoredDocument[] {
  return LOCALES.flatMap((locale) => {
    const chrome = demoChrome[locale];
    if (!chrome) return [];
    return [
      {
        _id: `navigation-${locale}`,
        _type: "navigation",
        language: locale,
        items: (chrome.items ?? []).map(({ _key, label, href, quiet }) => ({
          _key,
          _type: "navItem",
          label,
          href,
          ...(quiet ? { quiet } : {})
        })),
        ...(chrome.cta ? { cta: { _type: "linkField", label: chrome.cta.label, href: chrome.cta.href } } : {}),
        footerColumns: (chrome.footerColumns ?? []).map((column) => ({
          _key: column._key,
          _type: "footerColumn",
          title: column.title,
          links: (column.links ?? []).map(({ _key, label, href }) => ({ _key, _type: "linkField", label, href }))
        })),
        ...(chrome.footerNote ? { footerNote: chrome.footerNote } : {})
      }
    ];
  });
}

/* --------------------------------------------------------------- verify */

/** Asset identity differs between demo and Sanity; compare what matters: dimensions and type. */
function comparable(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(comparable);
  if (!isObject(node)) return node;
  if (isObject(node.asset) && isObject(node.asset.dimensions)) {
    const { asset, ...rest } = node;
    const { width, height } = (asset as { dimensions: { width: number; height: number } }).dimensions;
    return { ...(comparable(rest) as AnyObject), asset: `${width}x${height}` };
  }
  if (typeof node._id === "string" && typeof node.url === "string" && typeof node.mimeType === "string") {
    return `file:${node.mimeType}`;
  }
  const out: AnyObject = {};
  for (const [key, value] of Object.entries(node)) {
    if (value === undefined || key === "_id") continue;
    out[key] = comparable(value);
  }
  return out;
}

async function verify(written: Set<string>) {
  const failures: string[] = [];
  const differs = (id: string, label: string) => (written.has(id) ? failures : kept).push(label);
  const kept: string[] = [];
  for (const page of demoPages) {
    const params = { locale: page.language, slug: page.slug ?? "" };
    const stored = page.isHomepage
      ? await client.fetch(HOME_PAGE_QUERY, { locale: page.language }, { perspective: "published" })
      : await client.fetch(PAGE_QUERY, params, { perspective: "published" });
    if (!isDeepStrictEqual(comparable(stored), comparable(JSON.parse(JSON.stringify(page))))) {
      differs(pageId(page), `page ${page.language} ${page.slug ?? "(home)"}`);
    }
  }
  for (const locale of LOCALES) {
    const chrome = demoChrome[locale];
    if (!chrome) continue;
    const stored = await client.fetch(NAVIGATION_QUERY, { locale }, { perspective: "published" });
    if (!isDeepStrictEqual(comparable(stored), comparable(JSON.parse(JSON.stringify(chrome))))) {
      differs(`navigation-${locale}`, `navigation ${locale}`);
    }
  }
  if (kept.length) console.log(`note    kept documents differ from the demo content (edited in the Studio?): ${kept.join(", ")}`);
  if (failures.length) throw new Error(`Read-back differs from the demo content: ${failures.join(", ")}`);
  console.log("verify  everything written reads back identical to the demo content");
}

/* ----------------------------------------------------------------- main */

async function main() {
  const { projectId, dataset } = client.config();
  if (!projectId || projectId === "demomode") {
    throw new Error("No Sanity project: set NEXT_PUBLIC_SANITY_PROJECT_ID for the CLI (see .env.example).");
  }
  if (dataset === "production" && !allowProduction) {
    throw new Error("Refusing to seed production: it waits for the ADR 0007 review. Pass --allow-production once approved.");
  }
  console.log(`target  ${projectId}/${dataset}${dryRun ? " (dry run)" : ""}`);

  const images = new Set<string>();
  const files = new Set<string>();
  collectAssets([demoPages, Object.values(demoChrome)], images, files);
  const assetIds = new Map<string, string>();
  for (const url of images) assetIds.set(url, await upload("image", url));
  for (const url of files) assetIds.set(url, await upload("file", url));

  const documents = [...pageDocuments(assetIds), ...navigationDocuments(), ...translationDocuments()];
  if (dryRun) {
    console.log(JSON.stringify(documents, null, 2));
    return;
  }
  const existing = new Set(await client.fetch<string[]>("*[_id in $ids]._id", { ids: documents.map((document) => document._id) }));
  const transaction = client.transaction();
  const written = new Set<string>();
  for (const document of documents) {
    if (existing.has(document._id) && !replace) {
      console.log(`keep    ${document._id}`);
      continue;
    }
    transaction.createOrReplace(document);
    written.add(document._id);
    console.log(`${existing.has(document._id) ? "replace" : "create "} ${document._id}`);
  }
  if (written.size) await transaction.commit({ visibility: "sync" });
  await verify(written);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
