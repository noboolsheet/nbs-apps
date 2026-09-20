"use client"

import type { CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from '@/components/translation-provider'
import { Button } from '@/components/ui/button'

/*
  Navy Plinth, editorial-image variant (per DESIGN.md §5).
  The plinth stays type-led: the headline sits on solid navy, never on the
  photograph. The image accompanies the text (right-bleed on desktop, stacked
  below on mobile) and is fused into the plinth by a navy gradient + a navy
  multiply tint, so it reads editorial rather than stock and never sits behind
  the copy. This is the sanctioned variant, not the banned text-over-photo
  overlay. Entry motion stays pure CSS.
*/
export function Hero() {
  const { t } = useTranslation()
  const hero = t.hero

  return (
    <section
      aria-labelledby="hero-headline"
      className="relative overflow-hidden bg-ink-navy text-paper-cream"
    >
      {/*
        Desktop image: bleeds to the right edge of the section. The navy
        multiply tint harmonizes it with the palette; the left-to-right navy
        gradient keeps the seam beside the text fully navy so the photo only
        emerges on the far right, well clear of the copy column.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[55%] lg:block"
      >
        <Image
          src="/images/header-img.webp"
          alt=""
          fill
          priority
          sizes="55vw"
          className="object-cover [filter:saturate(0.8)_contrast(1.03)]"
          style={{ objectPosition: 'center' }}
        />
        <div className="absolute inset-0 bg-ink-navy opacity-45 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-navy from-0% via-ink-navy/55 via-[40%] to-transparent to-100%" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="lg:max-w-[56%]">
          <p
            className="label hero-rise uppercase text-warm-brick-on-navy"
            style={{ '--hero-delay': '0ms' } as RiseStyle}
          >
            {hero.label}
          </p>

          <h1
            id="hero-headline"
            className="display hero-rise mt-6 text-paper-cream"
            style={{ '--hero-delay': '80ms', maxWidth: '22ch' } as RiseStyle}
          >
            {hero.headline}
          </h1>

          <p
            className="lede hero-rise mt-8 text-paper-cream/85"
            style={{ '--hero-delay': '160ms', maxWidth: '56ch' } as RiseStyle}
          >
            {hero.lede}
          </p>

          <div
            className="hero-rise mt-10 flex flex-wrap gap-4"
            style={{ '--hero-delay': '240ms' } as RiseStyle}
          >
            <Button
              asChild
              size="lg"
              className="bg-paper-cream text-ink-navy uppercase tracking-wider hover:bg-paper-cream/90 transition-transform duration-200 ease-out hover:-translate-y-px"
            >
              <Link href="/modulo-iscrizione">{hero.primaryCta}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border border-paper-cream bg-transparent text-paper-cream uppercase tracking-wider shadow-none hover:bg-paper-cream hover:text-ink-navy transition-colors duration-200 ease-out"
            >
              <Link href="/contatti">{hero.secondaryCta}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

/*
  CSSProperties refuses unknown CSS custom-property keys without an assertion.
  Local type narrows the cast to just `--hero-delay`, leaves everything else typed.
*/
type RiseStyle = CSSProperties & { '--hero-delay': string }
