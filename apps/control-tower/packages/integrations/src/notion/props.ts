/**
 * Helpers genéricos para leer/escribir propiedades de Notion (title, rich_text, select, date).
 * Sin dominio de CT: solo traducen entre valores planos y el JSON verboso de la API de Notion.
 */
import type { NotionPage } from './client';

type Json = Record<string, unknown>;

// --- Escritura (valor plano → JSON de propiedad Notion) ---
export function writeTitle(text: string): Json {
  return { title: [{ text: { content: text } }] };
}
export function writeRichText(text: string | null | undefined): Json {
  return { rich_text: text ? [{ text: { content: text } }] : [] };
}
export function writeSelect(name: string | null | undefined): Json {
  return { select: name ? { name } : null };
}
export function writeDate(iso: string | null | undefined): Json {
  return { date: iso ? { start: iso } : null };
}
export function writeUrl(url: string | null | undefined): Json {
  return { url: url ? url : null };
}
export function writeNumber(n: number | null | undefined): Json {
  return { number: typeof n === 'number' ? n : null };
}

// --- Lectura (JSON de propiedad Notion → valor plano) ---
function asObj(v: unknown): Json | undefined {
  return v && typeof v === 'object' ? (v as Json) : undefined;
}
function plain(arr: unknown): string | undefined {
  if (!Array.isArray(arr)) return undefined;
  const s = arr
    .map((x) => {
      const o = asObj(x);
      return o && typeof o.plain_text === 'string' ? o.plain_text : '';
    })
    .join('');
  return s.trim() !== '' ? s : undefined;
}

/** Lee el valor de la propiedad título (se detecta por `type: 'title'`, sea cual sea su nombre). */
export function readTitle(page: NotionPage): string | undefined {
  for (const v of Object.values(page.properties)) {
    const o = asObj(v);
    if (o && o.type === 'title') return plain(o.title);
  }
  return undefined;
}
export function readRichText(page: NotionPage, name: string): string | undefined {
  const o = asObj(page.properties[name]);
  return o ? plain(o.rich_text) : undefined;
}
export function readSelect(page: NotionPage, name: string): string | undefined {
  const sel = asObj(asObj(page.properties[name])?.select);
  return sel && typeof sel.name === 'string' ? sel.name : undefined;
}
export function readDate(page: NotionPage, name: string): string | undefined {
  const d = asObj(asObj(page.properties[name])?.date);
  return d && typeof d.start === 'string' ? d.start : undefined;
}
export function readUrl(page: NotionPage, name: string): string | undefined {
  const u = asObj(page.properties[name])?.url;
  return typeof u === 'string' && u.trim() !== '' ? u : undefined;
}
export function readNumber(page: NotionPage, name: string): number | undefined {
  const n = asObj(page.properties[name])?.number;
  return typeof n === 'number' ? n : undefined;
}
