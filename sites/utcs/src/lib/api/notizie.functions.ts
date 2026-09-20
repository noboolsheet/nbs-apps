import { createServerFn } from "@tanstack/react-start";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { NOTIZIE_FALLBACK, notizieSchema, type NotizieData } from "../notizie";

// Server function que lee el contenido de la sezione Notizie desde
// `public/notizie.json`. El cuerpo de .handler corre solo en el servidor
// (SSR Nitro node-server), por lo que `node:fs` no entra al bundle del cliente.
//
// Se prueba la ruta de dev y la de prod (Docker) y se usa la primera que exista:
//   - dev  (`vite dev`):       <cwd>/public/notizie.json        (cwd = raiz del proyecto)
//   - prod (Docker node-server): <cwd>/.output/public/notizie.json  (cwd = /app, ver Dockerfile)
// La lectura es en runtime, asi que un cambio en el JSON se refleja al recargar.
const CANDIDATE_PATHS = [
  resolve(process.cwd(), "public/notizie.json"),
  resolve(process.cwd(), ".output/public/notizie.json"),
];

async function readNotizieFile(): Promise<string | null> {
  for (const path of CANDIDATE_PATHS) {
    try {
      return await readFile(path, "utf-8");
    } catch {
      // Probamos la siguiente ruta candidata.
    }
  }
  return null;
}

export const getNotizie = createServerFn({ method: "GET" }).handler(
  async (): Promise<NotizieData> => {
    try {
      const raw = await readNotizieFile();
      if (raw === null) {
        console.error("[notizie] notizie.json non trovato; uso fallback vuoto");
        return NOTIZIE_FALLBACK;
      }
      return notizieSchema.parse(JSON.parse(raw));
    } catch (err) {
      // JSON malformato o non conforme allo schema: la pagina non deve rompersi.
      console.error("[notizie] notizie.json non valido; uso fallback vuoto", err);
      return NOTIZIE_FALLBACK;
    }
  },
);
