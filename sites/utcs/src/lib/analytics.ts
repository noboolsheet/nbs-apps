// Google Analytics 4 con Google Consent Mode v2.
//
// Por qué Consent Mode y no el snippet directo: la cookie-policy del sitio declara
// que los cookie analitici se instalan SOLO previo consenso (GDPR/Garante). Por eso
// gtag arranca con consent `denied` por defecto (no pone cookies ni envía datos
// identificables) y solo pasa a `granted` cuando el usuario acepta el banner.
//
// Por qué se carga desde el cliente (y no en el <head> vía head()): así podemos
// condicionarlo a producción (por hostname) y al consenso, sin inyectar gtag en
// local/nonprod. GA4 soporta plenamente cargar gtag.js dinámicamente.

export const GA_ID = "";

// Gate de "solo producción" por hostname: excluye localhost y nonprod sin depender
// de variables de entorno de build. Ajustar si el dominio real cambia.
const PROD_HOSTS = ["utcs.noboolsheet.local"];

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function analyticsEnabled(): boolean {
  // Sin GA_ID (demo estático) GA queda deshabilitado: no se inyecta gtag.js ni se
  // envían datos. También exige estar en un host de producción conocido.
  return (
    GA_ID !== "" &&
    typeof window !== "undefined" &&
    PROD_HOSTS.includes(window.location.hostname)
  );
}

let loaded = false;

export function loadAnalytics(): void {
  if (loaded || !analyticsEnabled()) return;
  loaded = true;

  window.dataLayer = window.dataLayer || [];
  // Shim oficial de gtag: empuja el objeto `arguments` (NO un array), que es lo
  // que gtag.js sabe interpretar. Los rest params son solo para tipar las llamadas;
  // dentro seguimos empujando `arguments`.
  function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  // Consent Mode v2: todo denegado por defecto hasta que el usuario acepte.
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });

  gtag("js", new Date());
  gtag("config", GA_ID);

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

export function updateAnalyticsConsent(granted: boolean): void {
  if (!analyticsEnabled() || typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
  });
}
