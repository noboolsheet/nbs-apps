"use client"

import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { TranslationProvider, useTranslation } from '@/components/translation-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { CookieBanner } from '@/components/cookie-banner'
import { FramedImage } from '@/components/framed-image'
import { Button } from '@/components/ui/button'
import { serviceImages } from '@/lib/service-images'
import { serviceDocLinks } from '@/lib/service-doc-links'
import type { Language } from '@/lib/i18n'
import type { ReactNode } from 'react'

type Props = { slug: string }

/*
  Renderiza la descripción de un servicio enlazando, si existe, la frase legal
  configurada en service-doc-links al documento correspondiente. Si no hay
  config o la frase no aparece en el texto, devuelve el string sin cambios.
*/
function renderDescription(
  description: string,
  slug: string,
  language: Language
): ReactNode {
  const link = serviceDocLinks[slug]
  if (!link) return description

  const phrase = link.phrase[language]
  const start = phrase ? description.indexOf(phrase) : -1
  if (start < 0) return description

  const before = description.slice(0, start)
  const after = description.slice(start + phrase.length)
  return (
    <>
      {before}
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 text-warm-brick transition-colors duration-200 ease-out hover:text-warm-brick/80"
      >
        {phrase}
      </a>
      {after}
    </>
  )
}

function ServiceContent({ slug }: Props) {
  const { t, language } = useTranslation()
  const items = t.servicesPage.items
  const index = items.findIndex((item) => item.id === slug)

  // The server already validated the slug; this is defensive only.
  if (index < 0) return null

  const service = items[index]
  const prev = index > 0 ? items[index - 1] : null
  const next = index < items.length - 1 ? items[index + 1] : null
  const numeral = String(index + 1).padStart(2, '0')

  return (
    <main id="main" tabIndex={-1} className="flex-1 outline-none">
      <article>
        <section className="bg-paper-cream pt-16 pb-24 md:pt-20 md:pb-28">
          <div className="mx-auto max-w-[1100px] px-6 sm:px-8 lg:px-12">
            <Link
              href="/i-nostri-servizi"
              className="group inline-flex items-center gap-3 text-ink-quiet transition-colors duration-200 ease-out hover:text-warm-brick"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-200 ease-out group-hover:-translate-x-1" />
              <span className="label uppercase">{t.servicesPage.hero.title}</span>
            </Link>

            <header className="mt-12">
              <p
                aria-hidden
                className="font-serif text-6xl leading-none text-ink-quiet md:text-7xl lg:text-8xl"
              >
                {numeral}
              </p>
              <h1 className="display mt-4 max-w-[16ch] text-ink-black">{service.title}</h1>
            </header>

            <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
              <p className="read text-ink-black">
                {renderDescription(service.description, service.id, language)}
              </p>
              {serviceImages[service.id] && (
                <FramedImage
                  src={serviceImages[service.id]}
                  alt={service.title}
                  className="aspect-[4/3]"
                  objectPosition="center 30%"
                  priority
                />
              )}
            </div>
          </div>
        </section>

        <nav
          aria-label={t.servicesPage.hero.title}
          className="bg-paper-cream-deep py-12 md:py-16"
        >
          <div className="mx-auto grid max-w-[1100px] gap-6 px-6 sm:px-8 sm:grid-cols-2 lg:px-12">
            {prev ? (
              <Link
                href={`/i-nostri-servizi/${prev.id}`}
                className="group block border border-ink-line bg-paper-cream p-6 transition-colors duration-200 ease-out hover:border-warm-brick"
                rel="prev"
              >
                <div className="flex items-baseline gap-3 text-ink-quiet transition-colors duration-200 ease-out group-hover:text-warm-brick">
                  <ArrowLeft className="h-4 w-4 transition-transform duration-200 ease-out group-hover:-translate-x-1" />
                  <span className="label uppercase">{String(index).padStart(2, '0')}</span>
                </div>
                <p className="title mt-3 text-ink-black transition-colors duration-200 ease-out group-hover:text-warm-brick">
                  {prev.title}
                </p>
              </Link>
            ) : (
              <span aria-hidden />
            )}

            {next ? (
              <Link
                href={`/i-nostri-servizi/${next.id}`}
                className="group block border border-ink-line bg-paper-cream p-6 text-right transition-colors duration-200 ease-out hover:border-warm-brick sm:text-right"
                rel="next"
              >
                <div className="flex items-baseline justify-end gap-3 text-ink-quiet transition-colors duration-200 ease-out group-hover:text-warm-brick">
                  <span className="label uppercase">{String(index + 2).padStart(2, '0')}</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1" />
                </div>
                <p className="title mt-3 text-ink-black transition-colors duration-200 ease-out group-hover:text-warm-brick">
                  {next.title}
                </p>
              </Link>
            ) : (
              <span aria-hidden />
            )}
          </div>
        </nav>
      </article>

      <section
        aria-labelledby="service-cta-headline"
        className="bg-ink-navy text-paper-cream"
      >
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20 lg:px-12">
          <p className="label uppercase text-warm-brick-on-navy">{t.servicesPage.cta.kicker}</p>
          <h2
            id="service-cta-headline"
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

export default function ServiceDetailClient({ slug }: Props) {
  return (
    <TranslationProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <ServiceContent slug={slug} />
        <Footer />
        <CookieBanner />
      </div>
    </TranslationProvider>
  )
}

