// Tipos, validacion y fallback del contenido de la sezione Notizie.
//
// El contenido (avvisi/bandi e offerte di lavoro) vive in `public/notizie.json`
// para poder aggiornarlo senza toccare il codice: si modifica il JSON e si
// ridistribuisce. Lo legge a runtime la server function `getNotizie`
// (src/lib/api/notizie.functions.ts) e lo valida con questo schema Zod.
//
// Reglas de formato del JSON:
//   - `avvisi[]`: { tag, date, title, text, link? }
//       · tag   -> etichetta breve, p. es. "Avviso" | "Bando" | "Comunicato".
//       · date  -> stringa libera, p. es. "12 Maggio 2026".
//       · link  -> opzionale: URL esterna o PDF. Se presente mostra "Leggi tutto".
//   - `offerte[]`: { role, city, type }

import { z } from "zod";

export const avvisoSchema = z.object({
  tag: z.string().min(1),
  date: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
  link: z.string().min(1).optional(),
});

export const offertaSchema = z.object({
  role: z.string().min(1),
  city: z.string().min(1),
  type: z.string().min(1),
});

export const notizieSchema = z.object({
  avvisi: z.array(avvisoSchema),
  offerte: z.array(offertaSchema),
});

export type Avviso = z.infer<typeof avvisoSchema>;
export type Offerta = z.infer<typeof offertaSchema>;
export type NotizieData = z.infer<typeof notizieSchema>;

// Degradacion elegante: si il file manca o e malformato, la pagina mostra
// gli stati vuoti invece di rompersi.
export const NOTIZIE_FALLBACK: NotizieData = { avvisi: [], offerte: [] };
