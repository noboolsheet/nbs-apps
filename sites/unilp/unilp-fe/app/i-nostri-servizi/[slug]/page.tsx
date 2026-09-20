import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { translations } from '@/lib/i18n'
import { JsonLd } from '@/components/json-ld'
import { buildServiceSchema, buildBreadcrumb } from '@/lib/structured-data'
import ServiceDetailClient from './service-detail-client'

const SERVICE_SLUGS: readonly string[] = translations.it.servicesPage.items.map((item) => item.id)

type RouteParams = { slug: string }

export function generateStaticParams(): RouteParams[] {
  return SERVICE_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>
}): Promise<Metadata> {
  const { slug } = await params
  const service = translations.it.servicesPage.items.find((item) => item.id === slug)
  if (!service) {
    return { title: 'Servizio non trovato | U.N.I.L.P.' }
  }
  const description = service.description.slice(0, 160).replace(/\s+\S*$/, '') + '…'
  return {
    title: `${service.title} | U.N.I.L.P.`,
    description,
    alternates: { canonical: `/i-nostri-servizi/${slug}` },
    openGraph: {
      title: `${service.title} | U.N.I.L.P.`,
      description,
      url: `/i-nostri-servizi/${slug}`,
      type: 'article',
    },
  }
}

export default async function Page({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params
  const service = translations.it.servicesPage.items.find((item) => item.id === slug)
  if (!service) {
    notFound()
  }
  const jsonLd = [
    buildServiceSchema(service),
    buildBreadcrumb([
      { name: 'Home', path: '/' },
      { name: translations.it.servicesPage.hero.title, path: '/i-nostri-servizi' },
      { name: service.title, path: `/i-nostri-servizi/${slug}` },
    ]),
  ]
  return (
    <>
      <JsonLd data={jsonLd} />
      <ServiceDetailClient slug={slug} />
    </>
  )
}
