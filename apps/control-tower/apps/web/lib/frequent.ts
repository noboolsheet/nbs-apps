/**
 * «Más usados» del menú lateral: lógica pura, separada del componente para poder probarla.
 *
 * Tres defectos que tenía la versión anterior y que esto arregla:
 *
 *  1. **Ordenaba por visitas totales, sin decaimiento.** Lo que usaste mucho hace un mes se quedaba arriba para
 *     siempre y lo de esta semana no subía: era «más usados alguna vez», no «más usados». Ahora la puntuación
 *     **decae** con una semivida de 30 días, así que la lista sigue tus hábitos actuales.
 *  2. **No olvidaba nada.** Se recortaba a 60 entradas *por número de visitas*, así que una página nueva podía caer
 *     antes que una vieja irrelevante. Ahora se purga lo que no se visita desde hace mucho.
 *  3. La etiqueta se leía del DOM a ciegas (ver el componente).
 */
export type FrequentEntry = { path: string; label: string; count: number; last: number };

const DAY_MS = 86_400_000;
/** Semivida de la puntuación: a los 30 días sin visitar, una página vale la mitad. */
export const HALF_LIFE_DAYS = 30;
/** Se olvida lo que no se visita desde hace tanto: si no has vuelto en cuatro meses, no es «más usado». */
export const FORGET_AFTER_DAYS = 120;
export const MAX_TRACKED = 60;

/** Visitas ponderadas por lo reciente que es la última. */
export function scoreEntry(e: FrequentEntry, now: number): number {
  const days = Math.max(0, (now - e.last) / DAY_MS);
  return e.count * Math.pow(0.5, days / HALF_LIFE_DAYS);
}

/** Purga lo olvidable, ordena por puntuación (desempata por lo más reciente) y recorta. */
export function rankFrequent(entries: FrequentEntry[], now: number): FrequentEntry[] {
  return entries
    .filter((e) => now - e.last <= FORGET_AFTER_DAYS * DAY_MS)
    .sort((a, b) => scoreEntry(b, now) - scoreEntry(a, now) || b.last - a.last)
    .slice(0, MAX_TRACKED);
}

/** Suma una visita a `path` (creándolo si es nuevo) y devuelve la lista ya ordenada. */
export function registerVisit(
  entries: FrequentEntry[],
  path: string,
  label: string,
  now: number,
): FrequentEntry[] {
  const found = entries.find((e) => e.path === path);
  if (found) {
    found.count += 1;
    found.last = now;
    // La etiqueta puede haber cambiado (se renombró el proyecto), pero NUNCA se degrada a la ruta cruda: entre un
    // nombre que ya teníamos y un `/projects/<uuid>`, el nombre gana.
    if (label !== path) found.label = label;
  } else {
    entries = [...entries, { path, label, count: 1, last: now }];
  }
  return rankFrequent(entries, now);
}

/** Corrige la etiqueta de una entrada sin contar otra visita (la usa el componente al aparecer el `<h1>` real). */
export function relabel(entries: FrequentEntry[], path: string, label: string): FrequentEntry[] {
  if (label === path) return entries;
  return entries.map((e) => (e.path === path ? { ...e, label } : e));
}

/** Entradas a MOSTRAR: hace falta haber vuelto al menos una vez (una visita suelta no es costumbre). */
export function topFrequent(entries: FrequentEntry[], now: number, shown: number): FrequentEntry[] {
  return rankFrequent(entries, now)
    .filter((e) => e.count > 1)
    .slice(0, shown);
}
