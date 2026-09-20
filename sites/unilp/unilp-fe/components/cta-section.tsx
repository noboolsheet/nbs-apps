"use client"

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from '@/components/translation-provider'
import { Button } from '@/components/ui/button'

/*
  Bottom Navy Plinth.
  Bookends the home page against the Hero plinth at the top. Same surface,
  smaller vertical rhythm, iscrizione-led copy. The pattern is deliberate
  recurrence, not novelty.
*/

export function CTASection() {
  const { t } = useTranslation()

  return (
    <section
      aria-labelledby="cta-headline"
      className="bg-ink-navy text-paper-cream"
    >
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20 lg:px-12">
        <p className="label uppercase text-warm-brick-on-navy">{t.iscrizione.title}</p>

        <h2 id="cta-headline" className="headline mt-4 max-w-[22ch] text-paper-cream">
          {t.iscrizione.subtitle}
        </h2>

        <p className="lede mt-6 max-w-[56ch] text-paper-cream/85">
          {t.iscrizione.description}
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Button
            asChild
            size="lg"
            className="bg-paper-cream uppercase tracking-wider text-ink-navy transition-transform duration-200 ease-out hover:-translate-y-px hover:bg-paper-cream/90"
          >
            <Link href="/modulo-iscrizione">
              {t.iscrizione.download}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border border-paper-cream bg-transparent uppercase tracking-wider text-paper-cream shadow-none transition-colors duration-200 ease-out hover:bg-paper-cream hover:text-ink-navy"
          >
            <Link href="/contatti">{t.hero.secondaryCta}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
