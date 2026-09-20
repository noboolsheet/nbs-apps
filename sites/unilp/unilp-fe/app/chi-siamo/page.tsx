import type { Metadata } from 'next'
import { JsonLd } from '@/components/json-ld'
import { buildBreadcrumb } from '@/lib/structured-data'
import ChiSiamoClient from './chi-siamo-client'

export const metadata: Metadata = {
  title: 'Chi Siamo | U.N.I.L.P.',
  description: 'L\'U.N.I.L.P. è una Confederazione Sindacale nazionale, unitaria, democratica e autonoma che promuove la libera associazione e l\'autotutela solidale e collettiva dei propri iscritti.',
  alternates: { canonical: '/chi-siamo' },
  openGraph: {
    title: 'Chi Siamo | U.N.I.L.P.',
    description: 'L\'U.N.I.L.P. è una Confederazione Sindacale nazionale, unitaria, democratica e autonoma.',
    url: '/chi-siamo',
    type: 'website',
  },
}

const breadcrumbJsonLd = buildBreadcrumb([
  { name: 'Home', path: '/' },
  { name: 'Chi Siamo', path: '/chi-siamo' },
])

export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <ChiSiamoClient />
    </>
  )
}
