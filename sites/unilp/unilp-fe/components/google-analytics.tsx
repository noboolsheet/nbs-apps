"use client"

import { useEffect, useRef } from 'react'
import { useCookieConsent } from '@/lib/cookie-consent'
import { GA_MEASUREMENT_ID } from '@/lib/analytics'

/*
  Carga Google Analytics (gtag.js) SOLO después de que el usuario acepta cookies
  ("basic consent mode"). Mientras no haya consentimiento no se contacta a Google,
  así que no se descarga gtag.js ni se escriben cookies de terceros: esto evita el
  hit de "third-party cookies" de Lighthouse en la visita por defecto.

  La fuente de verdad del consentimiento es lib/cookie-consent.ts. El banner
  (components/cookie-banner.tsx) escribe 'accepted'/'declined'; aquí solo
  reaccionamos a 'accepted'. No renderiza nada en el DOM.
*/
export function GoogleAnalytics() {
  const consent = useCookieConsent()
  const loaded = useRef(false)

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || consent !== 'accepted' || loaded.current) return
    loaded.current = true

    // Inicializa la cola de gtag antes de que el script termine de cargar; gtag.js
    // procesa lo que ya esté en dataLayer al iniciar.
    window.dataLayer = window.dataLayer || []
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args)
    }
    gtag('js', new Date())
    gtag('config', GA_MEASUREMENT_ID)

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    document.head.appendChild(script)
  }, [consent])

  return null
}
