import { useEffect, useRef, useState } from "react";
import { MapPin, ExternalLink, Loader2 } from "lucide-react";
import { SITE } from "@/lib/site";

const MAP_EMBED = SITE.maps.googleEmbed;
const GOOGLE_MAPS = SITE.maps.googleUrl;

type MapState = "idle" | "loading" | "loaded" | "error";

/**
 * Contact-section map with a click-to-load facade.
 *
 * Default (idle) shows an honest, never-blank location panel with no <iframe>:
 * nothing to scroll- or keyboard-trap, and no third-party request until the
 * user opts in (a privacy win). On click the Google Maps embed loads; if it's
 * blocked or too slow, a timeout surfaces a graceful fallback instead of a blank
 * panel. The Google Maps link works in every state.
 */
export function ContactMap() {
  const [state, setState] = useState<MapState>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function loadMap() {
    setState("loading");
    // Blocked or slow embed → fall back gracefully rather than show a blank box.
    timer.current = window.setTimeout(() => {
      setState((s) => (s === "loaded" ? s : "error"));
    }, 6000);
  }

  // Keep the iframe mounted through "error" too, so a late load can still recover.
  const mountIframe = state !== "idle";

  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-background/10 bg-background/5">
      {mountIframe && (
        <iframe
          title="Mappa Google della sede nazionale UAI-UTCS a Roma"
          src={MAP_EMBED}
          loading="lazy"
          onLoad={() => {
            window.clearTimeout(timer.current);
            setState("loaded");
          }}
          className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-500 ${
            state === "loaded" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Facade — covers the iframe until it is live. Never blank; no scroll/keyboard trap. */}
      {state !== "loaded" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-background">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background text-foreground shadow-md">
            <MapPin className="h-7 w-7 text-primary" />
          </div>
          <div className="mt-4 font-display text-xl font-semibold">Sede Nazionale UAI-UTCS</div>
          <div className="mt-1 text-sm text-background/70">{SITE.address.full}</div>

          {state === "error" && (
            <p className="mt-4 max-w-xs text-sm text-background/70">
              Non è stato possibile caricare la mappa interattiva. Aprila direttamente in Google
              Maps.
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {state === "idle" && (
              <button
                type="button"
                onClick={loadMap}
                className="inline-flex items-center gap-1.5 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-md transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <MapPin className="h-4 w-4" />
                Mostra mappa interattiva
              </button>
            )}
            {state === "loading" && (
              <span className="inline-flex items-center gap-2 rounded-md bg-background/10 px-4 py-2 text-sm font-medium text-background">
                <Loader2 className="h-4 w-4 animate-spin" />
                Caricamento mappa…
              </span>
            )}
            <a
              href={GOOGLE_MAPS}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-background/30 px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-background/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Apri in Google Maps
            </a>
          </div>
        </div>
      )}

      {/* Live map: brand label + a persistent escape to Google Maps. */}
      {state === "loaded" && (
        <>
          <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-foreground shadow-md">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Sede Nazionale UAI-UTCS · Roma</span>
          </div>
          <a
            href={GOOGLE_MAPS}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-md transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Apri in Google Maps
          </a>
        </>
      )}
    </div>
  );
}
