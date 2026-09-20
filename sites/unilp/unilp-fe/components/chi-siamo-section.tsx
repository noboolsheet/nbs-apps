"use client"

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from '@/components/translation-provider'

/*
  Home composition: Chi Siamo section anchor.
  Editorial layout: Warm Brick kicker, Source Serif headline, body in the read column,
  ghost link with brick on hover. No card, no shadow, no dark mode.
*/
export function ChiSiamoSection() {
  const { t } = useTranslation()

  return (
    <section className="bg-paper-cream py-20 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-12">
        <header className="max-w-2xl">
          <p className="label uppercase text-warm-brick-text">{t.chiSiamo.title}</p>
          <h2 className="headline mt-4 text-ink-black">{t.chiSiamo.subtitle}</h2>
        </header>

        <p className="read mt-10 text-ink-black">{t.chiSiamoSection.paragraph1}</p>

        <div className="mt-10">
          <Link
            href="/chi-siamo"
            className="group inline-flex items-center gap-3 text-ink-navy transition-colors duration-200 ease-out hover:text-warm-brick"
          >
            <span className="label uppercase">{t.chiSiamoSection.button}</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  )
}
