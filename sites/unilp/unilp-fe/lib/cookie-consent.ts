import { useEffect, useState } from 'react'

/*
  Single source of truth for cookie consent.
  The banner writes through setStoredConsent(); any embed that loads a third
  party (the Google Maps iframe) reads it via useCookieConsent() and only mounts
  once consent is 'accepted'. Centralising it here keeps the gate and the banner
  from drifting apart.
*/

export const CONSENT_STORAGE_KEY = 'cookie-consent'

// Same-tab listeners can't hear localStorage writes (the native `storage` event
// only fires in *other* tabs), so the setter also dispatches this event.
const CONSENT_EVENT = 'unilp:cookie-consent'

export type ConsentValue = 'accepted' | 'declined' | null

export function getStoredConsent(): ConsentValue {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(CONSENT_STORAGE_KEY)
  return value === 'accepted' || value === 'declined' ? value : null
}

export function setStoredConsent(value: Exclude<ConsentValue, null>) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CONSENT_STORAGE_KEY, value)
  window.dispatchEvent(new Event(CONSENT_EVENT))
}

// Starts as null on every render so SSR and the first client paint agree
// (consent is read only after mount), then syncs on same-tab and cross-tab changes.
export function useCookieConsent(): ConsentValue {
  const [consent, setConsent] = useState<ConsentValue>(null)

  useEffect(() => {
    const sync = () => setConsent(getStoredConsent())
    sync()
    window.addEventListener(CONSENT_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return consent
}
