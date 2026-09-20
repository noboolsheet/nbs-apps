"use client"

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from '@/components/translation-provider'

/*
  Flat accordion: horizontal-line-divided rows, no cards, no shadows.
  The plus rotates 45° to read as a close glyph when open; cheaper visually
  than a separate icon swap, and stable for assistive tech because the
  semantic is on the <button aria-expanded>, not on the icon.
*/

export function FAQSection() {
  const { t } = useTranslation()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="bg-paper-cream py-20 md:py-24">
      <div className="mx-auto max-w-[800px] px-6 sm:px-8">
        <header className="max-w-2xl">
          <p className="label uppercase text-warm-brick-text">FAQ</p>
          <h2 className="headline mt-4 text-ink-black">{t.faq.title}</h2>
          <p className="lede mt-4 text-ink-quiet">{t.faq.subtitle}</p>
        </header>

        <div className="mt-12 border-t border-ink-line">
          {t.faq.items.map((item, index) => {
            const isOpen = openIndex === index
            const triggerId = `faq-trigger-${index}`
            const panelId = `faq-panel-${index}`
            return (
              <div key={item.question} className="border-b border-ink-line">
                <button
                  type="button"
                  id={triggerId}
                  onClick={() => toggleFAQ(index)}
                  className="group flex w-full items-start justify-between gap-6 py-5 text-left"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                >
                  <span className="title text-ink-black transition-colors duration-200 ease-out group-hover:text-warm-brick">
                    {item.question}
                  </span>
                  <Plus
                    aria-hidden
                    className={`mt-1.5 h-5 w-5 shrink-0 text-ink-quiet transition-transform duration-300 ease-out ${
                      isOpen ? 'rotate-45 text-warm-brick' : ''
                    }`}
                  />
                </button>
                {/*
                  The panel stays mounted so the grid-rows open/close can animate
                  (display:none can't transition). `inert` when closed takes the
                  collapsed answer out of the tab order and the accessibility tree,
                  so screen readers don't read hidden answers. role=region +
                  aria-labelledby ties the panel back to its trigger.
                */}
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  inert={!isOpen}
                  className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="min-h-0">
                    <p className="read pb-6 pr-12 text-ink-black">{item.answer}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
