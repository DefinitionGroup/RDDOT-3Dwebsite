/**
 * The Spanish homepage and navigation, transcreated from the German in the
 * formal register ("usted", matching "Sie"). Synthetic until a native speaker
 * has reviewed it (sanity-pagebuilder spec, Phase 9).
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

const configureHref = "/es/configure";
const productKey = "rdtdot-signature-kitchen-v1";

const statementImageAlt = "Cocina Signature con luz de atardecer, frente de cristal y techo de madera";
const roomImageAlt = "Cocina oscura con ventanales industriales y una amplia isla de trabajo";

export const homeEs: PageDocument = {
  _id: "demo-page-es-home",
  title: "Inicio",
  slug: null,
  language: "es",
  isHomepage: true,
  seo: null,
  translations: null,
  content: [
    heroFilmDemo({
      anchor: "top",
      eyebrow: "Cocinas premium",
      headline: "Cocinas, en su *punto*.",
      summary: "Cocinas Signature modulares: planificadas en 3D, vistas en su propio espacio, fabricadas en Alemania.",
      primaryCta: { label: "Configurar su cocina", href: configureHref },
      filmButtonLabel: "Ver el vídeo",
      badge: "Fabricado en Alemania",
      film: { desktop: "/video/hero-1080.mp4", mobile: "/video/hero-720.mp4", poster: "/images/hero-poster.jpg" }
    }),
    statementDemo({
      anchor: "filosofia",
      label: "Filosofía",
      statement: "Una cocina no es un mueble. Es el espacio donde se *vive*.",
      paragraphs: [
        "Por eso cada cocina Signature no empieza en un catálogo, sino en usted: en su planta, en su luz y en la pregunta de dónde estará el café por la mañana. No planificamos cocinas de exposición. Planificamos el lugar donde empieza su día y donde sus noches se alargan.",
        "Bastan cuatro decisiones para empezar. Del resto se encarga un planificador que conoce su diseño: en persona, no con un formulario."
      ],
      link: { label: "Las cuatro decisiones", href: "#signature" },
      image: { url: "/images/signature-detail.webp", width: 2048, height: 1170, alt: statementImageAlt },
      caption: "Exclusive Line — luz de atardecer, cristal, roble"
    }),
    promisesDemo({
      anchor: "signature",
      label: "Signature",
      headline: "Cuatro decisiones.\nUn *hogar*.",
      intro:
        "Sin catálogo, sin mil opciones. Material, composición, revisión y un planificador que sigue pensando donde termina el configurador.",
      items: [
        {
          key: "material",
          label: "Material",
          title: "Materiales honestos",
          body: "Madera natural, gres porcelánico y lacas mate, elegidos para ganar pátina, no desgaste.",
          detail: [
            "Elegimos superficies que con el tiempo se vuelven más bellas, no más cansadas: madera natural aceitada que adquiere pátina. Frentes Fenix que cierran los arañazos finos con calor. Lacas mate antihuellas que siguen luciendo serenas después del desayuno.",
            "Lo que ve en el configurador es el material que después estará en su cocina, con los mismos colores y texturas."
          ]
        },
        {
          key: "technik",
          label: "Tecnología",
          title: "Tecnología silenciosa",
          body: "Frentes sin tiradores, cajones con cierre amortiguado, luz integrada. Tecnología que se siente, no que se ve.",
          detail: [
            "Sin tiradores significa para nosotros: el frente se abre con una ligera presión, el cajón cierra con suavidad y la luz está ahí cuando la necesita. Los electrodomésticos desaparecen en nichos hechos exactamente a su medida.",
            "La tecnología debe sentirse, no verse. Por eso una cocina Signature se reconoce sobre todo por lo que no se oye."
          ]
        },
        {
          key: "fertigung",
          label: "Fabricación",
          title: "Precisión de fábrica",
          body: "Fabricado en Alemania. Tolerancias en milímetros, pensado para décadas.",
          detail: [
            "Cuerpo, frente y encimera proceden de un único fabricante y se fabrican en Alemania. Su proyecto se convierte en un plano de fabricación, no en una interpretación: cada medida que ve en el configurador es la medida que se construye.",
            "Porque pensamos en décadas, herrajes y frentes están diseñados para un uso prolongado, no para la próxima tendencia."
          ]
        },
        {
          key: "planung",
          label: "Planificación",
          title: "Planificación personal",
          body: "Desde el primer boceto hasta el montaje le acompaña un planificador, no un formulario.",
          detail: [
            "Empieza en el configurador cuando y donde quiera, incluso sin cuenta. En cuanto guarda su cocina como proyecto y envía una solicitud, un planificador toma el relevo: revisa medidas, conexiones y electrodomésticos, y propone lo que el configurador aún no permite.",
            "Una sola persona de contacto, desde el primer boceto hasta la primera cena."
          ]
        }
      ],
      detailCta: { label: "Configurar su cocina", href: configureHref }
    }),
    materialsDemo({
      anchor: "materiales",
      productKey,
      label: "Materiales",
      headline: "Materiales que *perduran*.",
      intro:
        "Superficies que ganan pátina, no desgaste. Cuatro frentes y tres colores de cuerpo, todos sin tiradores, todos pensados para tocarse. Cada tarjeta cuenta de qué está hecha.",
      items: [
        {
          key: "walnut-memory",
          finishKey: "walnut-memory",
          name: "Nogal Memory",
          kind: "Chapa",
          body: "Madera natural, aceitada",
          image: {
            url: "/images/material-walnut-memory-wn832.png",
            width: 325,
            height: 425,
            alt: "Chapa Nogal Memory de veta serena",
            hotspot: { x: 0.5, y: 1 }
          },
          zoom: 1.4,
          detail: [
            "Chapa de madera natural con veta continua: el dibujo pasa de un frente a otro y ninguna hoja es igual a otra.",
            "Aceitada en lugar de lacada: la madera conserva el poro abierto, es cálida al tacto y puede oscurecerse con los años. Las pequeñas huellas de la vida se borran con un nuevo aceitado."
          ],
          facts: ["Chapa de madera natural", "aceitada, poro abierto", "veta continua"]
        },
        {
          key: "fenix-castoro",
          finishKey: "castoro-ottawa",
          name: "Castoro Ottawa",
          kind: "Fenix",
          body: "Nanotecnología, mate, autorreparable",
          image: {
            url: "/images/material-fenix-castoro-ottawa-0717.png",
            width: 512,
            height: 512,
            alt: "Fenix Castoro Ottawa, un marrón grisáceo cálido, mate"
          },
          detail: [
            "Una superficie nanotecnológica extremadamente mate y de tacto aterciopelado: las huellas no se ven, apenas refleja la luz y los microarañazos finos se cierran de nuevo con calor.",
            "Castoro Ottawa es un marrón grisáceo cálido que une con serenidad la madera y la piedra."
          ],
          facts: ["Antihuellas", "extremadamente mate", "reparable con calor"]
        },
        {
          key: "fenix-verde",
          finishKey: "verde-kitami",
          name: "Verde Kitami",
          kind: "Fenix",
          body: "Nanotecnología, mate, autorreparable",
          image: {
            url: "/images/material-fenix-verde-kitami-0794.png",
            width: 512,
            height: 512,
            alt: "Fenix Verde Kitami, un verde profundo, mate"
          },
          detail: [
            "La misma superficie nanotecnológica en un verde profundo y apagado. Verde Kitami parece casi gris a la luz del día y, al anochecer, intenso y sereno.",
            "Y es tan fácil de cuidar como todos los frentes Fenix: antihuellas, mate y reparable con calor."
          ],
          facts: ["Antihuellas", "extremadamente mate", "reparable con calor"]
        },
        {
          key: "porcelain",
          finishKey: "porcelain",
          name: "Porcelana",
          kind: "Laca",
          body: "Satinada, antihuellas",
          color: "#F5F1EA",
          colorAlt: "Porcelana, un blanco crema cálido lacado en satinado",
          detail: [
            "El clásico de la línea Signature: un blanco crema cálido, lacado satinado y antihuellas.",
            "La porcelana hace que los espacios pequeños parezcan más amplios y los grandes, más serenos; además, está incluida de serie."
          ],
          facts: ["Laca satinada", "Antihuellas", "incluida de serie"]
        }
      ],
      cta: { label: "Todas las superficies en el configurador", href: configureHref },
      detailCtaLabel: "Ver en la escena"
    }),
    configuratorDemo({
      anchor: "configurador",
      productKey,
      label: "Configurador",
      headline: "Planifique en 3D.\nGuárdelo como *proyecto*.",
      body: "Material, composición, revisión: tres decisiones, en directo en la escena. El precio orientativo sigue cada cambio y un proyecto guarda cada estado. Y si lo desea, la IA lo convierte en una foto en su propio espacio.",
      counterBefore: "De 0 a",
      counterAfter: "en cuatro clics.",
      image: { url: "/images/signature-detail.webp", width: 2048, height: 1170, alt: statementImageAlt },
      stages: [
        {
          key: "material",
          label: "Material",
          title: "Elegir frente y cuerpo",
          body: "Cuatro superficies, todas sin tiradores, tres colores de cuerpo. Cada elección se ve al instante en la escena."
        },
        {
          key: "layout",
          label: "Composición",
          title: "Definir la línea y la isla",
          body: "Arrastre módulos a la línea; la isla sin, normal o grande. El precio orientativo sigue cada cambio."
        },
        {
          key: "review",
          label: "Revisar",
          title: "Guardar y solicitar",
          body: "Cualquier estado puede convertirse en un proyecto: con versiones, fotos y una solicitud a su planificador."
        }
      ],
      ctaLabel: "Configurar ahora",
      explainerLabel: "Cómo funciona",
      explainerTitle: "Cuatro *clics*.",
      explainerIntro: "De la escena vacía a la solicitud a un planificador: sin cuenta, sin formulario, a su ritmo.",
      steps: [
        {
          label: "Material",
          title: "Elegir frente y cuerpo",
          body: "Cuatro superficies y tres colores de cuerpo, todos sin tiradores. Cada elección se ve al instante en la escena."
        },
        {
          label: "Composición",
          title: "Definir la línea y la isla",
          body: "Arrastre armarios a la escena, muévalos o cámbielos; la isla sin, normal o grande. El precio orientativo sigue cada cambio."
        },
        {
          label: "Revisar",
          title: "Leer el desglose, guardar el estado",
          body: "Cada partida del precio está a la vista. Guardado como proyecto, cada estado se conserva con sus versiones y fotos."
        },
        {
          label: "Solicitar",
          title: "Sumar a un planificador",
          body: "Sin compromiso, desde el propio proyecto. Un planificador revisa medidas, conexiones y electrodomésticos y se pone en contacto con usted personalmente."
        }
      ]
    }),
    roomStoryDemo({
      anchor: "espacio",
      label: "Visualización",
      headline: "Su espacio. Su *cocina*.",
      lead: "Combine frente, cuerpo y composición en tiempo real, y vea el resultado donde corresponde: en un espacio, no en una ficha técnica.",
      features: [
        {
          label: "Estudio",
          title: "Neutro, para material y medidas",
          body: "Una sala negra y luz cálida: aquí compara superficies y proporciones sin distracciones."
        },
        {
          label: "Apartamento",
          title: "La cocina en un espacio",
          body: "Un espacio amueblado con luz natural muestra cómo la línea dialoga con el suelo, las paredes y los muebles."
        },
        {
          label: "Foto IA",
          title: "Una foto de su configuración",
          body: "Cualquier estado guardado puede convertirse en segundos en una foto realista, para compartir, comparar y volver a encontrar."
        },
        {
          label: "Versiones y enlaces",
          title: "Cada estado se conserva",
          body: "Las versiones guardan lo que funcionó. Un enlace seguro muestra un estado sin abrir su proyecto."
        }
      ],
      cta: { label: "Ver en el configurador", href: configureHref },
      image: { url: "/images/signature-panorama.webp", width: 2048, height: 1170, alt: roomImageAlt },
      imageBadge: "Apartamento",
      caption: "Agile — ventanales industriales, negro mate"
    }),
    collectionsDemo({
      anchor: "lineas",
      label: "Líneas",
      headline: "Dos líneas. Una *filosofía*.",
      items: [
        {
          title: "Agile",
          subtitle: "Eficiencia. Con clase.",
          body: "Líneas claras, decisiones rápidas, planificación precisa. La línea para quienes saben exactamente lo que quieren.",
          link: { label: "Descubrir la línea", href: configureHref },
          image: { url: "/images/signature-panorama.webp", width: 2048, height: 1170, alt: roomImageAlt },
          caption: "Ventanales industriales, negro mate"
        },
        {
          title: "Exclusive Line",
          subtitle: "Alta gama. Sin concesiones.",
          body: "Materiales con profundidad, fabricación a medida y asesoramiento personal. La línea para espacios hechos para durar.",
          link: { label: "Descubrir la línea", href: configureHref },
          image: {
            url: "/images/signature-hero.jpg",
            width: 2048,
            height: 1170,
            alt: "Cocina Signature abierta con isla y cálida luz de atardecer"
          },
          caption: "Roble, gres porcelánico, negro mate"
        }
      ]
    }),
    closingDemo({
      headline: "Su cocina. Guardada en *su* cuenta.",
      body: "Configure como invitado y guarde con una dirección de correo electrónico: sin contraseña, sin formulario. Las versiones, las fotos y las solicitudes permanecen privadas en su proyecto, y un planificador está a solo un clic.",
      cta: { label: "Configurar su cocina", href: configureHref }
    })
  ]
};

export const chromeEs: SiteChrome = {
  items: [
    { _key: key("nav"), label: "Filosofía", href: "#filosofia", quiet: null },
    { _key: key("nav"), label: "Materiales", href: "#materiales", quiet: null },
    { _key: key("nav"), label: "Configurador", href: "#configurador", quiet: null },
    { _key: key("nav"), label: "Líneas", href: "#lineas", quiet: null },
    { _key: key("nav"), label: "Mi cuenta", href: "/es/konto", quiet: true }
  ],
  cta: link("Configurar su cocina", configureHref),
  footerColumns: [
    {
      _key: key("footer"),
      title: "Planificar",
      links: [
        { _key: key("footer-link"), label: "Configurador", href: configureHref },
        { _key: key("footer-link"), label: "Mi cuenta", href: "/es/konto" },
        { _key: key("footer-link"), label: "Solicitud", href: "/es/anfrage" }
      ]
    },
    {
      _key: key("footer"),
      title: "Cocinas",
      links: [
        { _key: key("footer-link"), label: "Agile", href: "#lineas" },
        { _key: key("footer-link"), label: "Exclusive Line", href: "#lineas" },
        { _key: key("footer-link"), label: "Materiales", href: "#materiales" }
      ]
    }
  ],
  footerNote: "Fabricado en Alemania"
};
