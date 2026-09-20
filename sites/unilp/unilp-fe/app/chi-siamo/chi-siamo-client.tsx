"use client"

import { TranslationProvider, useTranslation } from '@/components/translation-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { CookieBanner } from '@/components/cookie-banner'
import { FramedImage } from '@/components/framed-image'

function ChiSiamoContent() {
  const { t } = useTranslation()

  return (
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      <section
        aria-labelledby="chi-siamo-headline"
        className="bg-ink-navy text-paper-cream"
      >
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <p className="label uppercase text-warm-brick-on-navy">{t.chiSiamo.kicker}</p>
          <h1
            id="chi-siamo-headline"
            className="display mt-4 max-w-[18ch] text-paper-cream"
          >
            {t.chiSiamo.title}
          </h1>
          <p className="lede mt-6 max-w-[56ch] text-paper-cream/85">
            {t.chiSiamo.subtitle}
          </p>
        </div>
      </section>

      <section className="bg-paper-cream py-20 md:py-24">
        <div className="mx-auto max-w-[1100px] px-6 sm:px-8 lg:px-12">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <p className="read text-ink-black">{t.chiSiamo.description}</p>
            <FramedImage
              src="/images/chi-siamo.webp"
              alt={t.chiSiamo.imageAlt}
              className="aspect-[4/3]"
            />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="values-headline"
        className="bg-paper-cream-deep py-20 md:py-24"
      >
        <div className="mx-auto max-w-[1100px] px-6 sm:px-8 lg:px-12">
          <header className="max-w-2xl">
            <p className="label uppercase text-warm-brick-text">{t.chiSiamo.values.kicker}</p>
            <h2 id="values-headline" className="headline mt-4 text-ink-black">
              {t.chiSiamo.values.title}
            </h2>
          </header>

          <ol className="mt-12 border-t border-ink-line">
            {t.chiSiamo.values.items.map((value, index) => {
              const numeral = String(index + 1).padStart(2, '0')
              return (
                <li key={value.title} className="border-b border-ink-line">
                  <article className="grid grid-cols-[56px_1fr] gap-x-6 gap-y-3 py-8 md:grid-cols-[72px_1fr] md:py-10">
                    <p
                      aria-hidden
                      className="font-serif text-3xl text-ink-quiet md:text-4xl"
                    >
                      {numeral}
                    </p>
                    <div>
                      <h3 className="title text-ink-black">{value.title}</h3>
                      <p className="mt-3 max-w-prose text-ink-black">
                        {value.description}
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
        aria-labelledby="mission-headline"
        className="bg-paper-cream py-20 md:py-24"
      >
        <div className="mx-auto max-w-[1100px] px-6 sm:px-8 lg:px-12">
          <header className="max-w-2xl">
            <p className="label uppercase text-warm-brick-text">{t.chiSiamo.mission.kicker}</p>
            <h2 id="mission-headline" className="headline mt-4 text-ink-black">
              {t.chiSiamo.mission.title}
            </h2>
          </header>

          <div className="mt-10 grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
            <p className="read text-ink-black">
              {t.chiSiamo.mission.description}
            </p>
            <FramedImage
              src="/images/la-nostra-missione.webp"
              alt={t.chiSiamo.mission.imageAlt}
              className="aspect-[4/3] lg:order-first"
            />
          </div>
        </div>
      </section>
    </main>
  )
}

export default function ChiSiamoPage() {
  return (
    <TranslationProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <ChiSiamoContent />
        <Footer />
        <CookieBanner />
      </div>
    </TranslationProvider>
  )
}
