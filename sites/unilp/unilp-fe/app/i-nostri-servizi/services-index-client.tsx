"use client"

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { TranslationProvider, useTranslation } from '@/components/translation-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { CookieBanner } from '@/components/cookie-banner'
import { Button } from '@/components/ui/button'

function ServicesIndexContent() {
  const { t } = useTranslation()

  return (
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      <section
        aria-labelledby="services-hero"
        className="bg-ink-navy text-paper-cream"
      >
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <p className="label uppercase text-warm-brick-on-navy">{t.servicesPage.hero.kicker}</p>
          <h1
            id="services-hero"
            className="display mt-4 max-w-[18ch] text-paper-cream"
          >
            {t.servicesPage.hero.title}
          </h1>
          <p className="lede mt-6 max-w-[56ch] text-paper-cream/85">
            {t.servicesPage.hero.subtitle}
          </p>
        </div>
      </section>

      <section className="bg-paper-cream py-20 md:py-24">
        <div className="mx-auto max-w-[1100px] px-6 sm:px-8 lg:px-12">
          <ol className="border-t border-ink-line">
            {t.servicesPage.items.map((service, index) => {
              const numeral = String(index + 1).padStart(2, '0')
              return (
                <li key={service.id} className="border-b border-ink-line">
                  <Link
                    href={`/i-nostri-servizi/${service.id}`}
                    className="group grid grid-cols-[56px_1fr_24px] items-baseline gap-x-6 gap-y-2 py-8 md:grid-cols-[72px_1fr_28px] md:py-10"
                  >
                    <span
                      aria-hidden
                      className="font-serif text-3xl text-ink-quiet transition-colors duration-200 ease-out group-hover:text-warm-brick md:text-4xl"
                    >
                      {numeral}
                    </span>
                    <div>
                      <h2 className="title text-ink-black transition-colors duration-200 ease-out group-hover:text-warm-brick">
                        {service.title}
                      </h2>
                      <p className="mt-3 max-w-prose text-ink-quiet line-clamp-2">
                        {service.description}
                      </p>
                    </div>
                    <ArrowUpRight
                      aria-hidden
                      className="mt-2 h-5 w-5 shrink-0 text-ink-quiet transition-all duration-200 ease-out group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-warm-brick"
                    />
                  </Link>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="services-index-cta-headline"
        className="bg-ink-navy text-paper-cream"
      >
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20 lg:px-12">
          <p className="label uppercase text-warm-brick-on-navy">{t.servicesPage.cta.kicker}</p>
          <h2
            id="services-index-cta-headline"
            className="headline mt-4 max-w-[22ch] text-paper-cream"
          >
            {t.servicesPage.cta.title}
          </h2>
          <p className="lede mt-6 max-w-[56ch] text-paper-cream/85">
            {t.servicesPage.cta.subtitle}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button
              asChild
              size="lg"
              className="bg-paper-cream uppercase tracking-wider text-ink-navy transition-transform duration-200 ease-out hover:-translate-y-px hover:bg-paper-cream/90"
            >
              <Link href="/contatti">{t.servicesPage.cta.contact}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border border-paper-cream bg-transparent uppercase tracking-wider text-paper-cream shadow-none transition-colors duration-200 ease-out hover:bg-paper-cream hover:text-ink-navy"
            >
              <Link href="/modulo-iscrizione">{t.servicesPage.cta.register}</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function ServicesIndexClient() {
  return (
    <TranslationProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <ServicesIndexContent />
        <Footer />
        <CookieBanner />
      </div>
    </TranslationProvider>
  )
}
