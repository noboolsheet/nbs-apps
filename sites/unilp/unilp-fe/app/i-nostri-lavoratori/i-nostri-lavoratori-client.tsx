"use client"

import Link from 'next/link'
import { TranslationProvider, useTranslation } from '@/components/translation-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { CookieBanner } from '@/components/cookie-banner'
import { Button } from '@/components/ui/button'

function LavoratoriContent() {
  const { t } = useTranslation()

  return (
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      <section
        aria-labelledby="lavoratori-headline"
        className="bg-ink-navy text-paper-cream"
      >
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <p className="label uppercase text-warm-brick-on-navy">{t.lavoratori.kicker}</p>
          <h1
            id="lavoratori-headline"
            className="display mt-4 max-w-[18ch] text-paper-cream"
          >
            {t.lavoratori.title}
          </h1>
          <p className="lede mt-6 max-w-[56ch] text-paper-cream/85">
            {t.lavoratori.subtitle}
          </p>
        </div>
      </section>

      <section className="bg-paper-cream py-20 md:py-24">
        <div className="mx-auto max-w-[1100px] px-6 sm:px-8 lg:px-12">
          <p className="read text-ink-black">{t.lavoratori.intro}</p>
        </div>
      </section>

      <section
        aria-labelledby="benefits-headline"
        className="bg-paper-cream-deep py-20 md:py-24"
      >
        <div className="mx-auto max-w-[1100px] px-6 sm:px-8 lg:px-12">
          <header className="max-w-2xl">
            <p className="label uppercase text-warm-brick-text">{t.lavoratori.benefits.kicker}</p>
            <h2 id="benefits-headline" className="headline mt-4 text-ink-black">
              {t.lavoratori.benefits.title}
            </h2>
          </header>

          <ul className="mt-12 grid grid-cols-1 gap-x-12 gap-y-1 sm:grid-cols-2">
            {t.lavoratori.benefits.items.map((benefit) => (
              <li
                key={benefit}
                className="flex items-baseline gap-4 border-t border-ink-line py-4"
              >
                <span aria-hidden className="font-serif text-xl text-warm-brick">
                  +
                </span>
                <span className="text-ink-black">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="categories-headline"
        className="bg-paper-cream py-20 md:py-24"
      >
        <div className="mx-auto max-w-[1100px] px-6 sm:px-8 lg:px-12">
          <header className="max-w-2xl">
            <p className="label uppercase text-warm-brick-text">{t.lavoratori.categories.kicker}</p>
            <h2 id="categories-headline" className="headline mt-4 text-ink-black">
              {t.lavoratori.categories.title}
            </h2>
          </header>

          <ol className="mt-12 border-t border-ink-line">
            {t.lavoratori.categories.items.map((category, index) => {
              const numeral = String(index + 1).padStart(2, '0')
              return (
                <li key={category.id} className="border-b border-ink-line">
                  <article className="grid grid-cols-[56px_1fr] gap-x-6 gap-y-3 py-8 md:grid-cols-[72px_1fr] md:py-10">
                    <p
                      aria-hidden
                      className="font-serif text-3xl text-ink-quiet md:text-4xl"
                    >
                      {numeral}
                    </p>
                    <div>
                      <h3 className="title text-ink-black">{category.title}</h3>
                      <p className="mt-3 max-w-prose text-ink-black">
                        {category.description}
                      </p>
                    </div>
                  </article>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="lavoratori-cta"
        className="bg-ink-navy text-paper-cream"
      >
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20 lg:px-12">
          <p className="label uppercase text-warm-brick-on-navy">{t.lavoratori.cta.kicker}</p>
          <h2
            id="lavoratori-cta"
            className="headline mt-4 max-w-[22ch] text-paper-cream"
          >
            {t.lavoratori.cta.title}
          </h2>
          <p className="lede mt-6 max-w-[56ch] text-paper-cream/85">
            {t.lavoratori.cta.subtitle}
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button
              asChild
              size="lg"
              className="bg-paper-cream uppercase tracking-wider text-ink-navy transition-transform duration-200 ease-out hover:-translate-y-px hover:bg-paper-cream/90"
            >
              <Link href="/modulo-iscrizione">{t.lavoratori.cta.button}</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function LavoratoriPage() {
  return (
    <TranslationProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <LavoratoriContent />
        <Footer />
        <CookieBanner />
      </div>
    </TranslationProvider>
  )
}
