import type { Metadata } from 'next'
import { JsonLd } from '@/components/json-ld'
import { buildBreadcrumb } from '@/lib/structured-data'
import ContattiPage from './contatti-client'

export const metadata: Metadata = {
  title: 'Contatti | U.N.I.L.P.',
  description: 'Contatta U.N.I.L.P.: Via Roma 1, 00100 Roma. Email demo@example.com. Compila il modulo per richiedere informazioni o un appuntamento.',
  alternates: { canonical: '/contatti' },
  openGraph: {
    title: 'Contatti | U.N.I.L.P.',
    description: 'Contattaci per qualsiasi informazione o per fissare un appuntamento con i nostri esperti.',
    url: '/contatti',
    type: 'website',
  },
}

const breadcrumbJsonLd = buildBreadcrumb([
  { name: 'Home', path: '/' },
  { name: 'Contatti', path: '/contatti' },
])

export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <ContattiPage />
    </>
  )
}
