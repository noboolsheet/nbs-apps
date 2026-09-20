"use client"

import { useState } from 'react'
import { ExternalLink, MapPin } from 'lucide-react'
import { useTranslation } from '@/components/translation-provider'
import { Button } from '@/components/ui/button'

/*
  Address and hours live as flat editorial content, not in icon-in-circle cards.
  The map iframe is the only surface that gets a subtle inset; address/hours
  are typographic columns sitting alongside it on lg+.
*/

export function MapSection() {
  const { t } = useTranslation()
  // Use a key-free Google Maps embed driven by the canonical Italian address.
  // Routing via `q=` + `output=embed` produces a marker on the address; no API key needed.
  const mapEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(t.map.address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.map.address)}`

  // Consent gate: the Google embed sets third-party cookies and pulls heavy
  // Google JS, so it must NEVER load on its own — not even when site-wide cookies
  // are accepted. It mounts only when the visitor explicitly loads this embed via
  // the button below (`loadRequested`), which keeps Google off the page by default
  // (no third-party cookies, no extra network/JS). The "open in Google Maps" link
  // is the no-load alternative.
  const [loadRequested, setLoadRequested] = useState(false)
  const showMap = loadRequested

  return (
    <section className="bg-paper-cream-deep py-20 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-12">
        <header className="max-w-2xl">
          <p className="label uppercase text-warm-brick-text">{t.map.title}</p>
          <h2 className="headline mt-4 text-ink-black">{t.map.subtitle}</h2>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px] lg:gap-16">
          <div className="h-80 overflow-hidden border border-ink-line lg:h-full lg:min-h-[420px]">
            {showMap ? (
              <iframe
                src={mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={t.map.iframeTitle}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-5 bg-paper-cream px-6 py-10 text-center">
                <MapPin className="h-7 w-7 text-ink-quiet" aria-hidden />
                <p className="max-w-prose text-sm text-ink-quiet">{t.map.consent.message}</p>
                <Button
                  type="button"
                  onClick={() => setLoadRequested(true)}
                  variant="outline"
                  className="border border-ink-navy bg-transparent uppercase tracking-wider text-ink-navy shadow-none transition-colors duration-200 ease-out hover:bg-ink-navy hover:text-paper-cream"
                >
                  {t.map.consent.action}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-10">
            <div>
              <p className="label uppercase text-ink-quiet">{t.map.addressLabel}</p>
              <p className="title mt-3 text-ink-black">{t.map.address}</p>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-4 inline-flex items-center gap-2 text-ink-navy transition-colors duration-200 ease-out hover:text-warm-brick"
              >
                <span className="label uppercase">{t.common.openInMaps}</span>
                <ExternalLink className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:-translate-y-px group-hover:translate-x-px" />
              </a>
            </div>

            <div>
              <p className="label uppercase text-ink-quiet">{t.map.phoneLabel}</p>
              <a
                href="tel:+390000000000"
                className="title mt-3 inline-block text-ink-navy transition-colors duration-200 ease-out hover:text-warm-brick"
              >
                {t.map.phone}
              </a>
            </div>

            <div>
              <p className="label uppercase text-ink-quiet">{t.map.hoursTitle}</p>
              <ul className="mt-3 divide-y divide-ink-line border-t border-ink-line">
                {t.map.hours.map((item) => {
                  const isClosed = item.time === t.map.closed
                  return (
                    <li key={item.day} className="flex items-baseline justify-between py-3">
                      <span className="text-ink-black">{item.day}</span>
                      <span
                        className={
                          isClosed
                            ? 'label uppercase text-ink-quiet'
                            : 'tabular-nums text-ink-black'
                        }
                      >
                        {item.time}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
