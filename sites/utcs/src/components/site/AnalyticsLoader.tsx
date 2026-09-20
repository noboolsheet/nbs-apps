import { useEffect } from "react";

import { loadAnalytics, updateAnalyticsConsent } from "@/lib/analytics";
import { CONSENT_EVENT, readConsent } from "@/lib/consent";

// Puente entre el consentimiento de cookies y Google Analytics. No renderiza UI:
// en el cliente carga gtag (no-op fuera de producción), aplica el consenso ya
// guardado en revisitas y reacciona en vivo a los clicks del CookieBanner.
export function AnalyticsLoader() {
  useEffect(() => {
    loadAnalytics(); // no-op si no es un host de producción

    const apply = () => updateAnalyticsConsent(readConsent() === "accepted");

    apply(); // estado inicial (p. ej. visitante que ya había aceptado)
    window.addEventListener(CONSENT_EVENT, apply); // misma pestaña (banner)
    window.addEventListener("storage", apply); // otras pestañas

    return () => {
      window.removeEventListener(CONSENT_EVENT, apply);
      window.removeEventListener("storage", apply);
    };
  }, []);

  return null;
}
