/**
 * The English homepage and navigation, transcreated from the German. Synthetic
 * until a native speaker has reviewed it (sanity-pagebuilder spec, Phase 9).
 */
import type { PageDocument, SiteChrome } from "@/blocks/types";
import { closingDemo } from "@/blocks/closing/demo";
import { collectionsDemo } from "@/blocks/collections/demo";
import { configuratorDemo } from "@/blocks/configurator/demo";
import { heroFilmDemo } from "@/blocks/hero-film/demo";
import { materialsDemo } from "@/blocks/materials/demo";
import { promisesDemo } from "@/blocks/promises/demo";
import { roomStoryDemo } from "@/blocks/room-story/demo";
import { statementDemo } from "@/blocks/statement/demo";
import { key, link } from "../demo-helpers";

const configureHref = "/en/configure";
const productKey = "rdtdot-signature-kitchen-v1";

const statementImageAlt = "Signature kitchen in evening light with a glass front and wooden ceiling";
const roomImageAlt = "Dark kitchen with industrial windows and a generous work island";

export const homeEn: PageDocument = {
  _id: "demo-page-en-home",
  title: "Home",
  slug: null,
  language: "en",
  isHomepage: true,
  seo: null,
  translations: null,
  content: [
    heroFilmDemo({
      anchor: "top",
      eyebrow: "Premium kitchens",
      headline: "Kitchens, to the *point*.",
      summary: "Modular Signature kitchens: planned in 3D, seen in your own space, made in Germany.",
      primaryCta: { label: "Configure your kitchen", href: configureHref },
      filmButtonLabel: "Watch the film",
      badge: "Made in Germany",
      film: { desktop: "/video/hero-1080.mp4", mobile: "/video/hero-720.mp4", poster: "/images/hero-poster.jpg" }
    }),
    statementDemo({
      anchor: "approach",
      label: "Approach",
      statement: "A kitchen is not a piece of furniture. It is the room where you *live*.",
      paragraphs: [
        "That is why every Signature kitchen starts not in a catalogue but with you: with your floor plan, your light, and the question of where the coffee goes in the morning. We don't plan showroom kitchens. We plan the place where your day begins and your evenings grow longer.",
        "Four decisions are enough to begin. A planner who knows your design takes care of the rest — in person, not by form."
      ],
      link: { label: "The four decisions", href: "#signature" },
      image: { url: "/images/signature-detail.webp", width: 2048, height: 1170, alt: statementImageAlt },
      caption: "Exclusive Line — evening light, glass, oak"
    }),
    promisesDemo({
      anchor: "signature",
      label: "Signature",
      headline: "Four decisions.\nOne *home*.",
      intro:
        "No catalogue, no thousand options. Material, layout, review — and a planner who keeps thinking where the configurator stops.",
      items: [
        {
          key: "material",
          label: "Material",
          title: "Honest materials",
          body: "Real wood, porcelain stoneware and matt lacquers — chosen to gain patina, not wear.",
          detail: [
            "We choose surfaces that grow more beautiful with time, not more tired: oiled real wood that develops a patina. Fenix fronts that close fine scratches again with heat. Matt anti-fingerprint lacquers that still look calm after breakfast.",
            "What you see in the configurator is the material that will later stand in your kitchen — with the same colours and textures."
          ]
        },
        {
          key: "technik",
          label: "Technology",
          title: "Quiet technology",
          body: "Handleless fronts, soft-close drawers, integrated light. Technology you feel rather than see.",
          detail: [
            "Handleless, for us, means: the front opens at a light touch, the drawer closes softly, the light is there when you need it. Appliances disappear into niches built exactly for them.",
            "Technology should be felt, not seen. That is why you recognise a Signature kitchen above all by what you don't hear."
          ]
        },
        {
          key: "fertigung",
          label: "Manufacturing",
          title: "Precision from the factory",
          body: "Made in Germany. Tolerances in millimetres, thinking in decades.",
          detail: [
            "Carcass, front and worktop come from a single source and are made in Germany. Your project becomes a production drawing, not an interpretation — every dimension you see in the configurator is the dimension that gets built.",
            "Because we think in decades, fittings and fronts are designed for long use, not for the next trend."
          ]
        },
        {
          key: "planung",
          label: "Planning",
          title: "Personal planning",
          body: "From the first draft to installation, a planner is by your side — not a form.",
          detail: [
            "You start in the configurator whenever and wherever you like — even without an account. As soon as you save your kitchen as a project and send a request, a planner takes over: checks dimensions, connections and appliances, and suggests what the configurator can't do yet.",
            "One point of contact, from the first draft to the first dinner."
          ]
        }
      ],
      detailCta: { label: "Configure your kitchen", href: configureHref }
    }),
    materialsDemo({
      anchor: "materials",
      productKey,
      label: "Materials",
      headline: "Material that *lasts*.",
      intro:
        "Surfaces that gain patina, not wear. Four fronts and three carcass colours — all handleless, all made to be touched. Each card tells you what it is made of.",
      items: [
        {
          key: "walnut-memory",
          finishKey: "walnut-memory",
          name: "Walnut Memory",
          kind: "Veneer",
          body: "Real wood, oiled",
          image: {
            url: "/images/material-walnut-memory-wn832.png",
            width: 325,
            height: 425,
            alt: "Walnut Memory veneer with a calm grain",
            hotspot: { x: 0.5, y: 1 }
          },
          zoom: 1.4,
          detail: [
            "Real-wood veneer with a continuous grain: the pattern runs on from front to front, and no leaf is like another.",
            "Oiled rather than lacquered — the wood stays open-pored, feels warm and may darken over the years. Small traces of life can simply be oiled away."
          ],
          facts: ["Real-wood veneer", "oiled, open-pored", "continuous grain"]
        },
        {
          key: "fenix-castoro",
          finishKey: "castoro-ottawa",
          name: "Castoro Ottawa",
          kind: "Fenix",
          body: "Nanotech, matt, self-healing",
          image: {
            url: "/images/material-fenix-castoro-ottawa-0717.png",
            width: 512,
            height: 512,
            alt: "Fenix Castoro Ottawa, a warm greyish brown, matt"
          },
          detail: [
            "An extremely matt nanotech surface with a velvety feel: fingerprints stay invisible, light is barely reflected, and fine micro-scratches close again with heat.",
            "Castoro Ottawa is a warm greyish brown that brings wood and stone calmly together."
          ],
          facts: ["Anti-fingerprint", "extremely matt", "thermally repairable"]
        },
        {
          key: "fenix-verde",
          finishKey: "verde-kitami",
          name: "Verde Kitami",
          kind: "Fenix",
          body: "Nanotech, matt, self-healing",
          image: {
            url: "/images/material-fenix-verde-kitami-0794.png",
            width: 512,
            height: 512,
            alt: "Fenix Verde Kitami, a deep green, matt"
          },
          detail: [
            "The same nanotech surface in a deep, muted green. Verde Kitami looks almost grey in daylight, and rich and calm in the evening.",
            "And it stays as easy to care for as every Fenix front: anti-fingerprint, matt, thermally repairable."
          ],
          facts: ["Anti-fingerprint", "extremely matt", "thermally repairable"]
        },
        {
          key: "porcelain",
          finishKey: "porcelain",
          name: "Porcelain",
          kind: "Lacquer",
          body: "Satin matt, anti-fingerprint",
          color: "#F5F1EA",
          colorAlt: "Porcelain, a warm cream white in satin-matt lacquer",
          detail: [
            "The classic of the Signature line: a warm cream white, satin-matt lacquered, with an anti-fingerprint finish.",
            "Porcelain makes small rooms feel larger and large rooms calmer — and it is included as standard."
          ],
          facts: ["Satin-matt lacquer", "Anti-fingerprint", "included as standard"]
        }
      ],
      cta: { label: "All surfaces in the configurator", href: configureHref },
      detailCtaLabel: "View in the scene"
    }),
    configuratorDemo({
      anchor: "configurator",
      productKey,
      label: "Configurator",
      headline: "Plan in 3D.\nSave as a *project*.",
      body: "Material, layout, review — three decisions, live in the scene. The indicative price follows every change; a project keeps every state. And if you like, AI turns it into a photo in your own room.",
      counterBefore: "From 0 to",
      counterAfter: "in four clicks.",
      image: { url: "/images/signature-detail.webp", width: 2048, height: 1170, alt: statementImageAlt },
      stages: [
        {
          key: "material",
          label: "Material",
          title: "Choose front and carcass",
          body: "Four surfaces, all handleless, three carcass colours. Every choice shows at once in the scene."
        },
        {
          key: "layout",
          label: "Layout",
          title: "Set the run and the island",
          body: "Drag modules into the run; the island none, standard or large. The indicative price follows every change."
        },
        {
          key: "review",
          label: "Review",
          title: "Save and request",
          body: "Any state can become a project: with versions, photos and a request to your planner."
        }
      ],
      ctaLabel: "Configure now",
      explainerLabel: "How it works",
      explainerTitle: "Four *clicks*.",
      explainerIntro: "From an empty scene to a request to a planner — no account, no form, at your own pace.",
      steps: [
        {
          label: "Material",
          title: "Choose front and carcass",
          body: "Four surfaces and three carcass colours, all handleless. Every choice shows at once in the scene."
        },
        {
          label: "Layout",
          title: "Set the run and the island",
          body: "Drag cabinets into the scene, move or swap them; the island none, standard or large. The indicative price follows every change."
        },
        {
          label: "Review",
          title: "Read the breakdown, save the state",
          body: "Every price item is laid open. Saved as a project, every state stays with its versions and photos."
        },
        {
          label: "Request",
          title: "Bring a planner on board",
          body: "Without obligation, straight from the project. A planner checks dimensions, connections and appliances and gets in touch personally."
        }
      ]
    }),
    roomStoryDemo({
      anchor: "room",
      label: "Visualisation",
      headline: "Your room. Your *kitchen*.",
      lead: "Put front, carcass and layout together in real time — and see the result where it belongs: in a room, not on a data sheet.",
      features: [
        {
          label: "Studio",
          title: "Neutral, for material and dimensions",
          body: "A black room, warm light: here you compare surfaces and proportions without distraction."
        },
        {
          label: "Apartment",
          title: "The kitchen in a room",
          body: "A furnished room in daylight shows how the line works with floor, walls and furniture."
        },
        {
          label: "AI photo",
          title: "A photo of your configuration",
          body: "Any saved state can become a realistic photo in seconds — to share, compare and find again."
        },
        {
          label: "Versions & links",
          title: "Every state stays",
          body: "Versions hold on to what worked. A secure link shows one state without opening your project."
        }
      ],
      cta: { label: "View in the configurator", href: configureHref },
      image: { url: "/images/signature-panorama.webp", width: 2048, height: 1170, alt: roomImageAlt },
      imageBadge: "Apartment",
      caption: "Agile — industrial windows, matt black"
    }),
    collectionsDemo({
      anchor: "lines",
      label: "Lines",
      headline: "Two lines. One *attitude*.",
      items: [
        {
          title: "Agile",
          subtitle: "Efficiency. With class.",
          body: "Clear lines, quick decisions, precise planning. The line for people who know exactly what they want.",
          link: { label: "Discover the line", href: configureHref },
          image: { url: "/images/signature-panorama.webp", width: 2048, height: 1170, alt: roomImageAlt },
          caption: "Industrial windows, matt black"
        },
        {
          title: "Exclusive Line",
          subtitle: "High-end. Without compromise.",
          body: "Depth of material, made to measure, personal advice. The line for rooms that are meant to stay.",
          link: { label: "Discover the line", href: configureHref },
          image: {
            url: "/images/signature-hero.jpg",
            width: 2048,
            height: 1170,
            alt: "Open Signature kitchen with an island in warm evening light"
          },
          caption: "Oak, porcelain stoneware, matt black"
        }
      ]
    }),
    closingDemo({
      headline: "Your kitchen. Kept in *your* account.",
      body: "Configure as a guest, save with an email address — no password, no form. Versions, photos and requests stay private with your project, and a planner is only a click away.",
      cta: { label: "Configure your kitchen", href: configureHref }
    })
  ]
};

export const chromeEn: SiteChrome = {
  items: [
    { _key: key("nav"), label: "Approach", href: "#approach", quiet: null },
    { _key: key("nav"), label: "Materials", href: "#materials", quiet: null },
    { _key: key("nav"), label: "Configurator", href: "#configurator", quiet: null },
    { _key: key("nav"), label: "Lines", href: "#lines", quiet: null },
    { _key: key("nav"), label: "My account", href: "/en/konto", quiet: true }
  ],
  cta: link("Configure your kitchen", configureHref),
  footerColumns: [
    {
      _key: key("footer"),
      title: "Plan",
      links: [
        { _key: key("footer-link"), label: "Configurator", href: configureHref },
        { _key: key("footer-link"), label: "My account", href: "/en/konto" },
        { _key: key("footer-link"), label: "Request", href: "/en/anfrage" }
      ]
    },
    {
      _key: key("footer"),
      title: "Kitchens",
      links: [
        { _key: key("footer-link"), label: "Agile", href: "#lines" },
        { _key: key("footer-link"), label: "Exclusive Line", href: "#lines" },
        { _key: key("footer-link"), label: "Materials", href: "#materials" }
      ]
    }
  ],
  footerNote: "Made in Germany"
};
