"use client"

import { useTranslation } from '@/components/translation-provider'
import type { Language } from '@/lib/i18n'

type LegalDocKey = 'privacy' | 'cookies' | 'avisoLegal'

const localeMap: Record<Language, string> = {
  it: 'it-IT',
  es: 'es-ES',
  en: 'en-GB',
}

export function LegalPage({ documentKey }: { documentKey: LegalDocKey }) {
  const { t, language } = useTranslation()
  const doc = t.legal[documentKey]

  return (
    <main id="main" tabIndex={-1} className="flex-1 bg-paper-cream py-16 md:py-20 outline-none">
      <div className="mx-auto max-w-[800px] px-6 sm:px-8">
        <p className="label uppercase text-warm-brick-text">{t.footer.legal}</p>
        <h1 className="display mt-4 text-ink-black">{doc.title}</h1>

        <div className="mt-12 space-y-12 text-ink-black">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="title text-ink-black">{section.heading}</h2>
              {section.paragraphs?.map((paragraph, i) => (
                <p key={i} className="mt-4">
                  {paragraph}
                </p>
              ))}
              {section.items && (
                <ul className="mt-4 list-disc space-y-2 pl-6 marker:text-warm-brick">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <p className="border-t border-ink-line pt-8 text-sm text-ink-quiet">
            {doc.lastUpdatedLabel}: {new Date().toLocaleDateString(localeMap[language])}
          </p>
        </div>
      </div>
    </main>
  )
}
