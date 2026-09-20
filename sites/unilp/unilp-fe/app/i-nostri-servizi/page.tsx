import type { Metadata } from 'next'
import { translations } from '@/lib/i18n'
import { JsonLd } from '@/components/json-ld'
import { buildItemList, buildBreadcrumb } from '@/lib/structured-data'
import ServicesIndexClient from './services-index-client'

export const metadata: Metadata = {
  title: 'I Nostri Servizi | U.N.I.L.P.',
  description: 'Supporto completo per lavoratori, pensionati e aziende: formazione finanziata, welfare, assistenza fiscale e previdenziale, sicurezza, conciliazioni, patronato.',
  alternates: { canonical: '/i-nostri-servizi' },
  openGraph: {
    title: 'I Nostri Servizi | U.N.I.L.P.',
    description: 'Supporto completo per lavoratori, pensionati e aziende.',
    url: '/i-nostri-servizi',
    type: 'website',
  },
}

const jsonLd = [
  buildItemList(translations.it.servicesPage.hero.title, translations.it.servicesPage.items),
  buildBreadcrumb([
    { name: 'Home', path: '/' },
    { name: translations.it.servicesPage.hero.title, path: '/i-nostri-servizi' },
  ]),
]

export default function Page() {
  return (
    <>
      <JsonLd data={jsonLd} />
      <ServicesIndexClient />
    </>
  )
}
