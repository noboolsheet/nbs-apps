/**
 * `knowledge_items.sourceUrl` es **texto libre** («URLs relacionadas»): a propósito admite VARIAS urls, porque un
 * recurso de la biblioteca puede tener más de una fuente (owner 2026-09-02). Pero un enlace de la interfaz necesita
 * una sola: si se mete el texto entero en un `href`, el enlace no lleva a ninguna parte.
 *
 * Esta función resuelve esa tensión sin recortar el campo: devuelve la url **sólo si el texto es exactamente una**
 * (separadores: espacios, saltos de línea, comas o punto y coma). Con varias devuelve `null` y quien llama decide el
 * respaldo — en la Biblioteca, el enlace a la página de Notion.
 */
export function singleExternalUrl(value: string | null | undefined): string | null {
  const parts = (value ?? '').split(/[\s,;]+/).filter(Boolean);
  if (parts.length !== 1) return null;
  const raw = parts[0]!;
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:' ? raw : null;
  } catch {
    return null;
  }
}
