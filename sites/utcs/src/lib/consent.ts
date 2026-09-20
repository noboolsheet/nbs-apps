// Fuente única del estado de consentimiento de cookies.
//
// El banner (CookieBanner) escribe aquí y el AnalyticsLoader lee de aquí, así no
// se duplican literales ni la lógica de localStorage. `writeConsent` además emite
// un evento en `window` porque el evento nativo `storage` NO se dispara en la
// misma pestaña que hizo el cambio: sin esto, GA no reaccionaría al click del
// usuario hasta recargar.

export const CONSENT_STORAGE_KEY = "utcs-cookie-consent";
export const CONSENT_EVENT = "utcs:cookie-consent";

export type ConsentValue = "accepted" | "rejected";

export function readConsent(): ConsentValue | null {
  try {
    const v = localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === "accepted" || v === "rejected" ? v : null;
  } catch {
    return null;
  }
}

export function writeConsent(value: ConsentValue): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    /* noop */
  }
  // Notifica en la misma pestaña (el evento `storage` solo llega a otras pestañas).
  try {
    window.dispatchEvent(new Event(CONSENT_EVENT));
  } catch {
    /* noop */
  }
}
