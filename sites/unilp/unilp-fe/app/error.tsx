"use client"

import { useEffect } from 'react'
import Link from 'next/link'
import { TranslationProvider, useTranslation } from '@/components/translation-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { CookieBanner } from '@/components/cookie-banner'
import { Button } from '@/components/ui/button'

function ErrorContent({ reset }: { reset: () => void }) {
  const { t } = useTranslation()
  return (
    <main id="main" tabIndex={-1} className="flex-1 flex items-center bg-paper-cream py-20 outline-none">
      <div className="mx-auto max-w-[700px] px-6 sm:px-8">
        <p
          aria-hidden
          className="font-serif text-7xl leading-none text-ink-quiet md:text-8xl"
        >
          500
        </p>
        <h1 className="display mt-6 max-w-[16ch] text-ink-black">
          {t.error.title}
        </h1>
        <p className="lede mt-6 max-w-prose text-ink-quiet">
          {t.error.description}
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Button
            type="button"
            onClick={reset}
            size="lg"
            className="bg-ink-navy uppercase tracking-wider text-paper-cream transition-colors duration-200 ease-out hover:bg-ink-navy-deep"
          >
            {t.error.retry}
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border border-ink-navy bg-transparent uppercase tracking-wider text-ink-navy shadow-none transition-colors duration-200 ease-out hover:bg-ink-navy hover:text-paper-cream"
          >
            <Link href="/">{t.error.action}</Link>
          </Button>
        </div>
        <p className="mt-8 text-sm text-ink-quiet">
          <Link
            href="/contatti"
            className="underline-offset-4 hover:underline hover:text-warm-brick"
          >
            {t.hero.secondaryCta}
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error)
    }
  }, [error])

  return (
    <TranslationProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <ErrorContent reset={reset} />
        <Footer />
        <CookieBanner />
      </div>
    </TranslationProvider>
  )
}
