import type { Metadata } from 'next'
import { JsonLd } from '@/components/json-ld'
import { buildBreadcrumb } from '@/lib/structured-data'
import LavoratoriPage from './i-nostri-lavoratori-client'

export const metadata: Metadata = {
  title: 'I Nostri Lavoratori | U.N.I.L.P.',
  description: 'Tutela e assistenza per lavoratori e pensionati di tutte le categorie: consulenza contrattuale, buste paga, vertenze, supporto legale, pensioni.',
  alternates: { canonical: '/i-nostri-lavoratori' },
  openGraph: {
    title: 'I Nostri Lavoratori | U.N.I.L.P.',
    description: 'Tutela e assistenza per lavoratori e pensionati di tutte le categorie.',
    url: '/i-nostri-lavoratori',
    type: 'website',
  },
}

const breadcrumbJsonLd = buildBreadcrumb([
  { name: 'Home', path: '/' },
  { name: 'I Nostri Lavoratori', path: '/i-nostri-lavoratori' },
])

export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <LavoratoriPage />
    </>
  )
}
