"use client"

import { Download, FileText } from 'lucide-react'
import { TranslationProvider, useTranslation } from '@/components/translation-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { CookieBanner } from '@/components/cookie-banner'
import { Button } from '@/components/ui/button'

function ModuloIscrizioneContent() {
  const { t } = useTranslation()

  return (
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      <section
        aria-labelledby="iscrizione-headline"
        className="bg-ink-navy text-paper-cream"
      >
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <p className="label uppercase text-warm-brick-on-navy">{t.iscrizione.kicker}</p>
          <h1
            id="iscrizione-headline"
            className="display mt-4 max-w-[18ch] text-paper-cream"
          >
            {t.iscrizione.title}
          </h1>
          <p className="lede mt-6 max-w-[56ch] text-paper-cream/85">
            {t.iscrizione.subtitle}
          </p>
        </div>
      </section>

      <section className="bg-paper-cream py-20 md:py-24">
        <div className="mx-auto max-w-[1100px] px-6 sm:px-8 lg:px-12">
          <p className="read text-ink-black">{t.iscrizione.description}</p>

          <article className="mt-16 border border-ink-line bg-paper-cream-deep p-8 md:p-12">
            <FileText
              className="h-10 w-10 text-ink-navy"
              strokeWidth={1.5}
              aria-hidden
            />
            <h2 className="title mt-6 text-ink-black">
              {t.iscrizione.documentTitle}
            </h2>
            <p className="mt-3 text-ink-quiet">{t.iscrizione.documentSubtitle}</p>
            <div className="mt-8">
              <Button
                asChild
                size="lg"
                className="bg-ink-navy uppercase tracking-wider text-paper-cream transition-colors duration-200 ease-out hover:bg-ink-navy-deep"
              >
                <a href="/documents/modulo-iscrizione.pdf" download>
                  <Download className="mr-2 h-5 w-5" />
                  {t.iscrizione.download}
                </a>
              </Button>
            </div>
          </article>
        </div>
      </section>

      <section
        aria-labelledby="instructions-headline"
        className="bg-paper-cream-deep py-20 md:py-24"
      >
        <div className="mx-auto max-w-[1100px] px-6 sm:px-8 lg:px-12">
          <header className="max-w-2xl">
            <p className="label uppercase text-warm-brick-text">{t.iscrizione.instructions.kicker}</p>
            <h2 id="instructions-headline" className="headline mt-4 text-ink-black">
              {t.iscrizione.instructions.title}
            </h2>
          </header>

          <ol className="mt-12 border-t border-ink-line">
            {t.iscrizione.instructions.steps.map((step, index) => {
              const numeral = String(index + 1).padStart(2, '0')
              return (
                <li key={step} className="border-b border-ink-line">
                  <div className="grid grid-cols-[56px_1fr] gap-x-6 py-6 md:grid-cols-[72px_1fr] md:py-8">
                    <p
                      aria-hidden
                      className="font-serif text-3xl text-ink-quiet md:text-4xl"
                    >
                      {numeral}
                    </p>
                    <p className="text-ink-black">{step}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </section>
    </main>
  )
}

export default function ModuloIscrizionePage() {
  return (
    <TranslationProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <ModuloIscrizioneContent />
        <Footer />
        <CookieBanner />
      </div>
    </TranslationProvider>
  )
}
