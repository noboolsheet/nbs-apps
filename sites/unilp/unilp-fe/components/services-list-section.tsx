"use client"

import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useTranslation } from '@/components/translation-provider'

/*
  Home composition: services index.
  Replaces the 8-icon-tile grid (PRODUCT.md anti-reference: "Servizi al cittadino"-style
  flat tile grids of identical cards with icons) with a 2-column editorial list.
  Serif numerals carry the wayfinding the icons used to. No icon haloes, no cards, no shadows.
*/

const serviceHrefs = [
  '/i-nostri-servizi/formazione-finanziata',
  '/i-nostri-servizi/assistenza-welfare',
  '/i-nostri-servizi/assistenza-fiscale',
  '/i-nostri-servizi/dimissioni-telematiche',
  '/i-nostri-servizi/sicurezza-lavoro',
  '/i-nostri-servizi/conciliazioni',
  '/i-nostri-servizi/contratti-aziendali',
  '/i-nostri-servizi/servizi-patronato',
]

export function ServicesListSection() {
  const { t } = useTranslation()

  return (
    <section className="bg-paper-cream-deep py-20 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-12">
        <header className="max-w-2xl">
          <p className="label uppercase text-warm-brick-text">{t.servicesList.title}</p>
          <h2 className="headline mt-4 text-ink-black">{t.servicesList.subtitle}</h2>
        </header>

        {/*
          Divider-rule dedup across column counts. Each item draws a top border as
          the divider, so rules land only between rows, never trailing after the last.
          The catch is the top row: its items have nothing above them, so their top
          border must be suppressed or it reads as a stray rule. In one column only
          item 1 leads the top row (first:border-t-0). At sm+ the grid is two columns,
          so item 2 also sits in the top row and gets its border removed too
          (sm:[&:nth-child(2)]:border-t-0). One rule per gap, clean top edge in both layouts.
        */}
        <ol className="mt-12 grid grid-cols-1 gap-x-12 sm:grid-cols-2">
          {t.servicesList.items.map((title, index) => (
            <li key={title} className="border-t border-ink-line first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
              <Link
                href={serviceHrefs[index]}
                className="group flex items-baseline gap-6 py-5 transition-colors duration-200 ease-out hover:text-warm-brick"
              >
                <span
                  aria-hidden
                  className="font-serif text-2xl text-ink-quiet transition-colors duration-200 ease-out group-hover:text-warm-brick"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="title flex-1 text-ink-black transition-colors duration-200 ease-out group-hover:text-warm-brick">
                  {title}
                </span>
                <ArrowUpRight
                  className="mt-1.5 h-4 w-4 shrink-0 text-ink-quiet transition-all duration-200 ease-out group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-warm-brick"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-12">
          <Link
            href="/i-nostri-servizi"
            className="group inline-flex items-center gap-3 text-ink-navy transition-colors duration-200 ease-out hover:text-warm-brick"
          >
            <span className="label uppercase">{t.servicesList.viewAll}</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}
