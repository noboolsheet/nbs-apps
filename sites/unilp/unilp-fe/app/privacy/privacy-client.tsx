"use client"

import { TranslationProvider } from '@/components/translation-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { CookieBanner } from '@/components/cookie-banner'
import { LegalPage } from '@/components/legal-page'

export default function PrivacyPage() {
  return (
    <TranslationProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <LegalPage documentKey="privacy" />
        <Footer />
        <CookieBanner />
      </div>
    </TranslationProvider>
  )
}
