"use client"

import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { useTranslation } from '@/components/translation-provider'

// Non-translatable partner data (logo, outbound link), keyed by the stable `id`
// that each partner carries in lib/i18n.ts. Keyed lookup, not array position, so
// the copy list and this map can never drift out of sync: a partner whose `id`
// isn't registered here is skipped rather than crashing on a missing entry.
const partnerMeta: Record<string, { logo: string; website: string }> = {
  efesto: { logo: '/images/logo-efesto.webp', website: 'https://example.com/' },
}

export function PartnersSection() {
  const { t } = useTranslation()

  return (
    <section className="bg-paper-cream py-20 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-12">
        <header className="max-w-2xl">
          <p className="label uppercase text-warm-brick-text">{t.partners.title}</p>
          <h2 className="headline mt-4 text-ink-black">{t.partners.subtitle}</h2>
        </header>

        <div className="mt-12 border-t border-ink-line">
          {t.partners.items.map((partner) => {
            const meta = partnerMeta[partner.id]
            if (!meta) return null
            return (
              <article
                key={partner.name}
                className="grid grid-cols-1 items-start gap-8 border-b border-ink-line py-10 md:grid-cols-[200px_1fr] md:gap-12"
              >
                <div className="flex h-40 w-40 items-center justify-center bg-paper-cream-deep p-4">
                  <Image
                    src={meta.logo}
                    alt={`${partner.name} logo`}
                    width={140}
                    height={140}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <p className="label uppercase text-ink-quiet">{partner.fullName}</p>
                  <h3 className="title mt-2 text-ink-black">{partner.name}</h3>
                  <p className="mt-4 max-w-prose text-ink-black">{partner.description}</p>
                  <a
                    href={meta.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group mt-6 inline-flex items-center gap-2 text-ink-navy transition-colors duration-200 ease-out hover:text-warm-brick"
                  >
                    <span className="label uppercase">{t.common.visitSite}</span>
                    <ExternalLink className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:-translate-y-px group-hover:translate-x-px" />
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
