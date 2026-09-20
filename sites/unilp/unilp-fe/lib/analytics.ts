/*
  Configuración de Google Analytics 4 (gtag.js).

  gtag.js NO se carga hasta que el usuario acepta cookies; la carga diferida vive
  en components/google-analytics.tsx (basic consent mode), de modo que sin
  consentimiento no se contacta a Google ni se escriben cookies de terceros.
  La fuente de verdad del consentimiento es lib/cookie-consent.ts.
*/

// El Measurement ID se puede sobrescribir por entorno; por defecto vacío (GA desactivado en el demo).
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? ''

type GtagArgs = unknown[]

declare global {
  interface Window {
    // dataLayer mezcla arrays de argumentos de gtag() y objetos de evento.
    dataLayer: unknown[]
    gtag?: (...args: GtagArgs) => void
  }
}

// Helper para eventos personalizados futuros.
// IMPORTANTE: no incluir datos personales (emails, nombres) en `params`.
export function pushEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event: name, ...params })
}
