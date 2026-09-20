"use client"

import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react'
import { translations, languages, type Language } from '@/lib/i18n'

const STORAGE_KEY = 'unilp-lang'
const DEFAULT_LANGUAGE: Language = 'it'

type TranslationContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: typeof translations['it']
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

function isSupportedLanguage(value: string | null): value is Language {
  return value !== null && value in languages
}

function detectInitialLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (isSupportedLanguage(stored)) return stored

  const navLang = window.navigator.language.slice(0, 2).toLowerCase()
  if (isSupportedLanguage(navLang)) return navLang

  return DEFAULT_LANGUAGE
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Deep-merge translations over `it` so any key missing in es/en falls back to Italian.
// Italian is the source of truth — see lib/i18n.ts.
function mergeWithFallback<T>(fallback: T, override: unknown, path = ''): T {
  if (override === undefined || override === null) {
    if (process.env.NODE_ENV !== 'production' && path) {
      console.warn(`[i18n] Missing translation at "${path}" — falling back to it.`)
    }
    return fallback
  }
  if (isPlainObject(fallback) && isPlainObject(override)) {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(fallback)) {
      const nextPath = path ? `${path}.${key}` : key
      out[key] = mergeWithFallback(
        (fallback as Record<string, unknown>)[key],
        (override as Record<string, unknown>)[key],
        nextPath
      )
    }
    return out as T
  }
  return override as T
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE)

  useEffect(() => {
    setLanguageState(detectInitialLanguage())
  }, [])

  const t = useMemo(
    () => mergeWithFallback(translations.it, translations[language]),
    [language]
  )

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language
      document.title = t.metadata.title
    }
  }, [language, t])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, lang)
    }
  }, [])

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider')
  }
  return context
}
