/**
 * Reglas PURAS del **bloc de notas rápidas** (M44). Una nota es texto libre de una línea o de veinte; al darle un
 * destino hay que repartirlo en los campos de la entidad que se crea, y eso es lo que hace esto.
 */

export interface ParsedQuickNote {
  /** Primera línea, recortada: el título del registro que se va a crear. */
  title: string;
  /** El resto del texto (sin la primera línea), o `null` si la nota era de una sola línea. */
  rest: string | null;
  /** Primera URL que aparezca en la nota, si hay alguna: un enlace pegado a secas se convierte en «Por revisar». */
  url: string | null;
}

/** Tope del título en las entidades destino (`title` es varchar(300) en tareas y 200 en el resto). */
const TITLE_MAX = 180;

/**
 * Parte una nota en título + resto + url.
 *
 * El título es la **primera línea no vacía**, y si es más larga que el tope se corta por la última palabra que quepa
 * (cortar a mitad de palabra se lee como un error). Lo que no quepa **no se pierde**: sigue entero en `rest`, que va
 * al campo largo de la entidad. Una nota sin ninguna línea con texto no es una nota (el Zod y la base ya lo rechazan).
 */
export function parseQuickNote(body: string): ParsedQuickNote {
  const lines = body.split('\n');
  const firstIdx = lines.findIndex((l) => l.trim().length > 0);
  const first = firstIdx === -1 ? '' : lines[firstIdx]!.trim();
  const restRaw = firstIdx === -1 ? '' : lines.slice(firstIdx + 1).join('\n').trim();

  let title = first;
  let overflow = '';
  if (first.length > TITLE_MAX) {
    const cut = first.slice(0, TITLE_MAX);
    const lastSpace = cut.lastIndexOf(' ');
    title = (lastSpace > TITLE_MAX / 2 ? cut.slice(0, lastSpace) : cut).trimEnd();
    overflow = first.slice(title.length).trim();
  }

  const rest = [overflow, restRaw].filter((s) => s.length > 0).join('\n\n') || null;
  const url = body.match(/https?:\/\/[^\s<>"')]+/)?.[0] ?? null;
  return { title, rest, url };
}

/**
 * Destinos a los que se puede mandar una nota. No son «todas las entidades» a propósito: son los cuatro sitios donde
 * de verdad acaba una idea suelta —hacer algo, decidir algo, saber algo, leer algo—. Si hiciera falta uno más, se
 * añade aquí y en `fileQuickNote`; el test ata las dos listas.
 */
export const QUICK_NOTE_DESTINATIONS = ['task', 'decision', 'knowledge_item', 'review_item'] as const;
export type QuickNoteDestination = (typeof QUICK_NOTE_DESTINATIONS)[number];
