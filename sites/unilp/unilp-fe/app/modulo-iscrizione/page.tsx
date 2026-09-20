import type { Metadata } from 'next'
import { JsonLd } from '@/components/json-ld'
import { buildBreadcrumb } from '@/lib/structured-data'
import ModuloIscrizionePage from './modulo-iscrizione-client'

export const metadata: Metadata = {
  title: 'Modulo di Iscrizione | U.N.I.L.P.',
  description: 'Scarica il modulo di iscrizione U.N.I.L.P., compilalo e invialo via e-mail per unirti alla nostra Confederazione Sindacale.',
  alternates: { canonical: '/modulo-iscrizione' },
  openGraph: {
    title: 'Modulo di Iscrizione | U.N.I.L.P.',
    description: 'Scarica il modulo di iscrizione, compilalo e invialo via e-mail.',
    url: '/modulo-iscrizione',
    type: 'website',
  },
}

const breadcrumbJsonLd = buildBreadcrumb([
  { name: 'Home', path: '/' },
  { name: 'Modulo di Iscrizione', path: '/modulo-iscrizione' },
])

export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <ModuloIscrizionePage />
    </>
  )
}
