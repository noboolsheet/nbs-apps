"use client"

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { TranslationProvider, useTranslation } from '@/components/translation-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { CookieBanner } from '@/components/cookie-banner'

function NotFoundContent() {
  const { t } = useTranslation()
  return (
    <main id="main" tabIndex={-1} className="flex-1 flex items-center bg-paper-cream py-20 outline-none">
      <div className="mx-auto max-w-[700px] px-6 sm:px-8">
        <p
          aria-hidden
          className="font-serif text-7xl leading-none text-ink-quiet md:text-8xl"
        >
          404
        </p>
        <h1 className="display mt-6 max-w-[16ch] text-ink-black">
          {t.notFound.title}
        </h1>
        <p className="lede mt-6 max-w-prose text-ink-quiet">
          {t.notFound.description}
        </p>
        <div className="mt-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 text-ink-navy transition-colors duration-200 ease-out hover:text-warm-brick"
          >
            <span className="label uppercase">{t.notFound.action}</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function NotFound() {
  return (
    <TranslationProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <NotFoundContent />
        <Footer />
        <CookieBanner />
      </div>
    </TranslationProvider>
  )
}
