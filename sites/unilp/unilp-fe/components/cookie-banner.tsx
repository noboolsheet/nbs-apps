"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useTranslation } from '@/components/translation-provider'
import { getStoredConsent, setStoredConsent } from '@/lib/cookie-consent'
import { Button } from '@/components/ui/button'

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    if (!getStoredConsent()) {
      setIsVisible(true)
    }
  }, [])

  const handleAccept = () => {
    setStoredConsent('accepted')
    setIsVisible(false)
  }

  const handleDecline = () => {
    setStoredConsent('declined')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div
      role="dialog"
      aria-label={t.cookies.message}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-line bg-paper-cream shadow-md"
    >
      <div className="relative mx-auto flex max-w-[1200px] flex-col gap-4 px-6 py-5 sm:px-8 md:flex-row md:items-center md:justify-between md:gap-8">
        <p className="max-w-prose pr-12 text-sm text-ink-black md:pr-0">
          {t.cookies.message}{' '}
          <Link
            href="/cookies"
            className="text-ink-navy underline-offset-4 hover:underline hover:text-warm-brick"
          >
            {t.cookies.learnMore}
          </Link>
        </p>
        <div className="flex flex-shrink-0 items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            className="border border-ink-line bg-transparent uppercase tracking-wider text-ink-black shadow-none hover:bg-paper-cream-deep hover:text-ink-black"
          >
            {t.cookies.decline}
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="bg-ink-navy uppercase tracking-wider text-paper-cream hover:bg-ink-navy-deep"
          >
            {t.cookies.accept}
          </Button>
        </div>
        <button
          type="button"
          onClick={handleDecline}
          className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center text-ink-quiet hover:text-warm-brick md:hidden"
          aria-label={t.common.close}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
