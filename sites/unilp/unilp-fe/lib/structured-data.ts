/*
  Builders puros de datos estructurados Schema.org (JSON-LD) para GEO/SEO.

  Todos devuelven objetos planos serializables que se inyectan en el HTML
  estático (export) mediante el server component <JsonLd> (components/json-ld.tsx).
  La fuente de verdad del contenido es `translations.it` en lib/i18n.ts, igual
  que hace app/sitemap.ts, para no duplicar textos ni URLs.
*/

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unilp.noboolsheet.local'

// El sitio se exporta con `trailingSlash: true`, así que las URLs canónicas
// reales terminan en `/`. Construimos las URLs absolutas igual para que los
// nodos JSON-LD coincidan con el canonical emitido en cada página.
export function absUrl(path: string): string {
  if (path === '/' || path === '') return `${SITE_URL}/`
  const clean = path.replace(/^\/+|\/+$/g, '')
  return `${SITE_URL}/${clean}/`
}

// @id estable de la Organization declarada en app/layout.tsx, para referenciarla
// desde el resto de nodos (provider, publisher) sin repetir sus datos.
export const ORG_ID = `${SITE_URL}/#organization`
export const ORG_REF = { '@id': ORG_ID } as const

export const WEBSITE_ID = `${SITE_URL}/#website`

type FaqItem = { question: string; answer: string }
type ServiceItem = { id: string; title: string; description: string }
type Crumb = { name: string; path: string }

/* WebSite: nodo raíz del sitio, enlazado al publisher (Organization). */
export function buildWebSite(name: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: absUrl('/'),
    name,
    description,
    inLanguage: 'it-IT',
    publisher: ORG_REF,
  }
}

/* FAQPage: una entrada Question/Answer por cada FAQ visible en la home. */
export function buildFaqPage(items: readonly FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

/* Service: un servicio del sindicato, provisto por la Organization. */
export function buildServiceSchema(service: ServiceItem) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.title,
    description: service.description,
    serviceType: service.title,
    provider: ORG_REF,
    areaServed: { '@type': 'Country', name: 'Italia' },
    url: absUrl(`/i-nostri-servizi/${service.id}`),
  }
}

/* ItemList: enumera todos los servicios para que la IA liste la oferta. */
export function buildItemList(name: string, services: readonly ServiceItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: services.map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: service.title,
      url: absUrl(`/i-nostri-servizi/${service.id}`),
    })),
  }
}

/* BreadcrumbList: ruta jerárquica desde Home hasta la página actual. */
export function buildBreadcrumb(trail: readonly Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absUrl(crumb.path),
    })),
  }
}
