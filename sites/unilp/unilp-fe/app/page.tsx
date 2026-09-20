import type { Metadata } from 'next'
import { HomeClient } from './home-client'
import { JsonLd } from '@/components/json-ld'
import { buildFaqPage } from '@/lib/structured-data'
import { translations } from '@/lib/i18n'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

// Las FAQ se renderizan visibles en la home (components/faq-section.tsx), por lo
// que el schema FAQPage describe contenido realmente presente en la página.
const faqJsonLd = buildFaqPage(translations.it.faq.items)

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqJsonLd} />
      <HomeClient />
    </>
  )
}
