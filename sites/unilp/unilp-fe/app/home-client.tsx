"use client"

import { TranslationProvider } from '@/components/translation-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { CookieBanner } from '@/components/cookie-banner'
import { Hero } from '@/components/hero'
import { ChiSiamoSection } from '@/components/chi-siamo-section'
import { PartnersSection } from '@/components/partners-section'
import { ServicesListSection } from '@/components/services-list-section'
import { MapSection } from '@/components/map-section'
import { FAQSection } from '@/components/faq-section'
import { CTASection } from '@/components/cta-section'

export function HomeClient() {
  return (
    <TranslationProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          <Hero />
          <ChiSiamoSection />
          <ServicesListSection />
          <PartnersSection />
          <MapSection />
          <FAQSection />
          <CTASection />
        </main>
        <Footer />
        <CookieBanner />
      </div>
    </TranslationProvider>
  )
}
