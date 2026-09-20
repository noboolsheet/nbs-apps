// Sitemap XML generada en runtime (server route, sin componente UI).
//
// El nombre de archivo `sitemap[.]xml.ts` se resuelve a la ruta `/sitemap.xml`
// (los corchetes escapan el punto). Se enumera el sitio en el momento de la
// petición, así que al añadir un tipo de formación en `FORMAZIONE_TYPES` la
// sitemap se actualiza sola, sin paso de build.

import { createFileRoute } from "@tanstack/react-router";
import { SITE } from "@/lib/site";
import { FORMAZIONE_TYPES } from "@/lib/formazione";

// Rutas estáticas conocidas. Se mantienen a mano porque son pocas y estables.
const STATIC_PATHS = [
  "/",
  "/chi-siamo",
  "/servizi",
  "/apl",
  "/caf-patronato",
  "/formazione",
  "/notizie",
  "/contatti",
  "/convenzioni",
  "/registrati",
  "/privacy-policy",
  "/cookie-policy",
  "/note-legali",
];

function buildSitemap(): string {
  const paths = [
    ...STATIC_PATHS,
    ...FORMAZIONE_TYPES.map((t) => `/formazione/${t.slug}`),
  ];
  const urls = paths
    .map((p) => `  <url><loc>${SITE.url}${p === "/" ? "/" : p}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(buildSitemap(), {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        }),
    },
  },
});
