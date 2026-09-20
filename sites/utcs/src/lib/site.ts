// Datos de contacto centralizados del sitio.
//
// Por qué: dirección, horario, teléfono, email y WhatsApp aparecían duplicados en
// varios componentes (Home, Contatti, Footer, Header, mapa). Centralizarlos aquí
// evita inconsistencias y hace que un cambio (p. ej. la sede) se haga en un solo sitio.
// Solo se centralizan los usos estructurados; las menciones dentro di prosa
// (pagine legali, meta description, FAQ) restano nel testo.

const MAPS_QUERY = "Via+Roma+1%2C+00100+Roma%2C+Italia";

export const SITE = {
  name: "UAI-UTCS – Unione Turismo Commercio e Servizi",
  // URL de producción (sin barra final). Fuente única para canonical, og:url,
  // sitemap.xml y los campos url/@id de los datos estructurados (JSON-LD).
  url: "https://utcs.noboolsheet.local",
  address: {
    street: "Via Roma 1",
    cap: "00100",
    city: "Roma",
    country: "Italia",
    full: "Via Roma 1, 00100 Roma, Italia",
  },
  // Horario de apertura. `hours` es solo el rango; `hoursLine` incluye los días.
  hours: "9:00–13:00 / 14:30–18:30",
  hoursLine: "Lun–Ven: 9:00–13:00 / 14:30–18:30",
  hoursDays: "Lunedì – Venerdì",
  hoursRange: "9:00 – 13:00 / 14:30 – 18:30",
  phone: { display: "+39 000 000 000", href: "tel:+390000000000" },
  email: "demo@example.com",
  emailHref: "mailto:demo@example.com",
  whatsapp: { display: "+39 000 000 000", href: "https://wa.me/390000000000" },
  maps: {
    googleUrl: `https://www.google.com/maps/search/?api=1&query=${MAPS_QUERY}`,
    // Embed de Google Maps sin API key (apariencia estándar/plana).
    googleEmbed: `https://maps.google.com/maps?q=${MAPS_QUERY}&z=16&output=embed`,
  },
} as const;
