"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, Globe } from 'lucide-react'
import { useTranslation } from '@/components/translation-provider'
import { languages, type Language } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/*
  Active route indication: a 2px Warm Brick underline beneath the current route,
  per DESIGN.md Section 5. Hover on inactive links fades the underline in with a
  simple opacity transition; color does not change on hover (the underline is the
  signal). Reduced-motion users get the underline instantly, no fade.

  Mobile drawer can't run the same underline cleanly inside a tap-target row,
  so the active row is marked with `font-semibold` + `aria-current` instead.
*/

const isActiveRoute = (pathname: string, href: string): boolean => {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { language, setLanguage, t } = useTranslation()
  const pathname = usePathname() ?? '/'

  const navLinks = [
    { href: '/', label: t.nav.home },
    { href: '/chi-siamo', label: t.nav.chiSiamo },
    { href: '/i-nostri-servizi', label: t.nav.servizi },
    { href: '/i-nostri-lavoratori', label: t.nav.lavoratori },
    { href: '/modulo-iscrizione', label: t.nav.iscrizione },
    { href: '/contatti', label: t.nav.contatti },
  ]

  return (
    <header className="sticky top-0 z-50 bg-paper-cream border-b border-ink-line">
      {/*
        Skip-to-content link. Visually hidden until focused, then pops to the
        upper-left as a navy chip so the first Tab on any page jumps the
        keyboard user past the header chrome straight into <main id="main">.
        WCAG 2.4.1 (Bypass Blocks).
      */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-ink-navy focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:uppercase focus:tracking-wider focus:text-paper-cream focus:outline-none"
        style={{ letterSpacing: '0.04em' }}
      >
        {t.common.skipToContent}
      </a>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link
            href="/"
            className="flex-shrink-0 rounded-sm focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            <Image
              src="/images/logo-unilp.webp"
              alt={t.metadata.title}
              width={180}
              height={60}
              className="h-12 md:h-14 w-auto"
              priority
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-1" aria-label={t.common.mainNavigation}>
            {navLinks.map((link) => {
              const isActive = isActiveRoute(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={
                    'relative px-4 py-5 text-sm font-medium text-ink-black rounded-sm ' +
                    'focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] ' +
                    'after:absolute after:left-4 after:right-4 after:bottom-3 after:h-[2px] after:bg-warm-brick ' +
                    'after:transition-opacity after:duration-200 after:ease-out motion-reduce:after:transition-none ' +
                    (isActive ? 'after:opacity-100' : 'after:opacity-0 hover:after:opacity-100')
                  }
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">{languages[language]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(languages) as Language[]).map((lang) => (
                  <DropdownMenuItem
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`min-h-11 ${
                      language === lang
                        ? 'bg-ink-navy text-paper-cream focus:bg-ink-navy focus:text-paper-cream'
                        : ''
                    }`}
                  >
                    {languages[lang]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? t.common.closeMenu : t.common.openMenu}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-nav"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <nav
            id="mobile-nav"
            className="lg:hidden py-4 border-t border-ink-line"
            aria-label={t.common.mainNavigation}
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = isActiveRoute(pathname, link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={
                      'flex min-h-[56px] items-center px-4 text-base text-ink-black rounded-sm transition-colors duration-200 ease-out hover:text-warm-brick ' +
                      'focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] ' +
                      (isActive ? 'font-semibold text-warm-brick' : 'font-medium')
                    }
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
