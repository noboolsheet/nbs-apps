// Helpers SEO / GEO centralizados.
//
// Por qué: las técnicas técnicas de GEO (datos estructurados JSON-LD, canonical,
// Open Graph con URLs absolutas) se repiten en muchas rutas. Centralizarlas aquí
// evita duplicar strings y mantiene una sola fuente de verdad junto a `SITE`.
//
// El JSON-LD se inyecta con la clave especial `script:ld+json` dentro del array
// `meta` de `head()`; TanStack Router la renderiza como
// <script type="application/ld+json"> en el <head> durante el SSR.

import { SITE } from "./site";

/** Convierte un path relativo (`/servizi`) en URL absoluta (`https://utcs.noboolsheet.local/servizi`). */
export function absUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE.url}${p}`;
}

/** Link canonical autorreferente para el `head()` de una ruta. */
export function canonical(path: string) {
  return { rel: "canonical" as const, href: absUrl(path) };
}

/** Meta `og:url` para una ruta concreta (acompaña al canonical). */
export function ogUrl(path: string) {
  return { property: "og:url", content: absUrl(path) };
}

// Imagen social por defecto. Interino: se reutiliza el hero existente. Para
// máxima compatibilidad con scrapers conviene añadir un PNG dedicado 1200×630
// en `public/images/og-default.png` y apuntar aquí.
const OG_IMAGE = absUrl("/images/hero-1.webp");

/** Meta OG/Twitter globales (imagen, locale, site_name). Se ponen una vez en __root. */
export const OG_DEFAULT_META = [
  { property: "og:site_name", content: "UAI-UTCS" },
  { property: "og:locale", content: "it_IT" },
  { property: "og:image", content: OG_IMAGE },
  { property: "og:image:width", content: "1920" },
  { property: "og:image:height", content: "1080" },
  { property: "og:image:alt", content: SITE.name },
  { name: "twitter:image", content: OG_IMAGE },
];

// Entrada vacía de `meta` (todos los campos son opcionales en el tipo de
// TanStack), compatible con el array sin filtrar la clave especial.
type MetaEntry = Record<never, never>;

/**
 * Envuelve un objeto schema.org en la entrada de `meta` que el runtime de
 * TanStack Router renderiza como <script type="application/ld+json">
 * (ver headContentUtils). El sistema de tipos de esta versión no expone la
 * clave especial `script:ld+json`, así que casteamos para conciliarlos.
 */
export function ldJson<T extends Record<string, unknown>>(schema: T): MetaEntry {
  return { "script:ld+json": schema } as unknown as MetaEntry;
}

const POSTAL_ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: SITE.address.street,
  postalCode: SITE.address.cap,
  addressLocality: SITE.address.city,
  addressCountry: "IT",
};

const TELEPHONE = SITE.phone.href.replace("tel:", "");

/** schema.org Organization para la entidad UTCS (datos desde `SITE`). */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: absUrl("/images/logo-utcs.png"),
    email: SITE.email,
    telephone: TELEPHONE,
    address: POSTAL_ADDRESS,
  };
}

/** schema.org LocalBusiness/ProfessionalService con sede, horario y contacto. */
export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE.url}/#localbusiness`,
    name: SITE.name,
    url: SITE.url,
    image: absUrl("/images/logo-utcs.png"),
    email: SITE.email,
    telephone: TELEPHONE,
    address: POSTAL_ADDRESS,
    areaServed: "IT",
    openingHours: ["Mo-Fr 09:00-13:00", "Mo-Fr 14:30-18:30"],
    hasMap: SITE.maps.googleUrl,
  };
}

/** schema.org ItemList genérica (p. ej. listado de avvisi/bandi). */
export function itemListSchema(items: ReadonlyArray<{ name: string; url?: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      ...(it.url ? { url: it.url } : {}),
    })),
  };
}

/** schema.org FAQPage a partir de un array de preguntas/respuestas. */
export function faqPageSchema(faqs: ReadonlyArray<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
