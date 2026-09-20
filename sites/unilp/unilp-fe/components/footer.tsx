"use client"

import Link from 'next/link'
import Image from 'next/image'
import { Mail, Globe, Phone, Instagram } from 'lucide-react'
import { useTranslation } from '@/components/translation-provider'

const FacebookIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

const WhatsAppIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

/*
  Institutional logos.
  `needsBg` flags logos that ship dark and need a cream patch behind them when
  placed on the navy plinth, so the institutional mark stays legible.
*/
const partners = [
  { src: '/images/logo-repubblica.webp', alt: 'Repubblica Italiana', needsBg: false },
  { src: '/images/logo-palazzo-chigi.webp', alt: 'Presidenza del Consiglio dei Ministri', needsBg: false },
  { src: '/images/logo-cnel.webp', alt: 'CNEL, Consiglio Nazionale Economia e Lavoro', needsBg: false },
  { src: '/images/logo-inail.webp', alt: 'INAIL', needsBg: true },
  { src: '/images/logo-inps.webp', alt: 'INPS', needsBg: false },
]

// WhatsApp contact. Defaults to the demo placeholder number (+39 000 000 000) and can be
// overridden per-environment via NEXT_PUBLIC_WHATSAPP_NUMBER (any format; all
// non-digits are stripped to build the wa.me link).
const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '+39 000 000 000').replace(/\D/g, '')

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="bg-ink-navy text-paper-cream">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <div className="lg:col-span-2">
            {/*
              The full-color logo is recolored to a near-cream silhouette by the
              brightness-0 invert filter so it stays legible on the navy plinth.
              A dedicated cream SVG variant would be cleaner; flagged for content work.
            */}
            <Image
              src="/images/logo-unilp.webp"
              alt="U.N.I.L.P."
              width={200}
              height={67}
              className="mb-6 h-14 w-auto brightness-0 invert"
            />
            <p className="max-w-md text-sm text-paper-cream/75">
              {t.footer.description}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <a
                href="mailto:demo@example.com"
                className="group inline-flex items-center gap-3 text-sm text-paper-cream/75 transition-colors duration-200 ease-out hover:text-warm-brick-on-navy"
              >
                <Mail className="h-4 w-4" aria-hidden />
                demo@example.com
              </a>
              <a
                href="tel:+390000000000"
                className="group inline-flex items-center gap-3 text-sm text-paper-cream/75 transition-colors duration-200 ease-out hover:text-warm-brick-on-navy"
              >
                <Phone className="h-4 w-4" aria-hidden />
                +39 000 000 000
              </a>
              <a
                href="https://unilp.noboolsheet.local"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 text-sm text-paper-cream/75 transition-colors duration-200 ease-out hover:text-warm-brick-on-navy"
              >
                <Globe className="h-4 w-4" aria-hidden />
                unilp.noboolsheet.local
              </a>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-11 items-center justify-center border border-paper-cream/20 text-paper-cream/75 transition-colors duration-200 ease-out hover:border-warm-brick hover:text-warm-brick-on-navy"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 w-11 items-center justify-center border border-paper-cream/20 text-paper-cream/75 transition-colors duration-200 ease-out hover:border-warm-brick hover:text-warm-brick-on-navy"
                aria-label="Facebook"
              >
                <FacebookIcon />
              </a>
              {WHATSAPP_NUMBER && (
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 w-11 items-center justify-center border border-paper-cream/20 text-paper-cream/75 transition-colors duration-200 ease-out hover:border-warm-brick hover:text-warm-brick-on-navy"
                  aria-label="WhatsApp"
                >
                  <WhatsAppIcon />
                </a>
              )}
            </div>
          </div>

          <div>
            <p className="label uppercase text-warm-brick-on-navy">{t.footer.links}</p>
            <ul className="mt-6 space-y-3">
              {[
                { href: '/', label: t.nav.home },
                { href: '/chi-siamo', label: t.nav.chiSiamo },
                { href: '/i-nostri-servizi', label: t.nav.servizi },
                { href: '/i-nostri-lavoratori', label: t.nav.lavoratori },
                { href: '/modulo-iscrizione', label: t.nav.iscrizione },
                { href: '/contatti', label: t.nav.contatti },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-paper-cream/75 transition-colors duration-200 ease-out hover:text-warm-brick-on-navy"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="label uppercase text-warm-brick-on-navy">{t.footer.legal}</p>
            <ul className="mt-6 space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-paper-cream/75 transition-colors duration-200 ease-out hover:text-warm-brick-on-navy"
                >
                  {t.footer.privacy}
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-sm text-paper-cream/75 transition-colors duration-200 ease-out hover:text-warm-brick-on-navy"
                >
                  {t.footer.cookies}
                </Link>
              </li>
              <li>
                <Link
                  href="/note-legali"
                  className="text-sm text-paper-cream/75 transition-colors duration-200 ease-out hover:text-warm-brick-on-navy"
                >
                  {t.footer.terms}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-paper-cream/15 pt-10">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {partners.map((partner) => (
              <Image
                key={partner.src}
                src={partner.src}
                alt={partner.alt}
                width={120}
                height={60}
                className={
                  partner.needsBg
                    ? 'h-14 w-auto object-contain bg-paper-cream p-2'
                    : 'h-14 w-auto object-contain'
                }
              />
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-paper-cream/15 pt-8 text-center">
          <p className="text-sm text-paper-cream/55">
            © {new Date().getFullYear()} {t.metadata.title}. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  )
}
