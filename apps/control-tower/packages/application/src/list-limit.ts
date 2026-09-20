/**
 * Tope por defecto de las consultas de lista que alimentan una PÁGINA (F-28).
 *
 * Antes ninguna lista tenía techo: `select … from tabla` sin `limit`. Con datos de un usuario no se nota, pero
 * el problema es que no hay ningún freno — el día que se note, se notará de golpe (memoria del render, tamaño
 * del HTML y tiempo de la consulta, todo a la vez).
 *
 * **Es opt-in a propósito.** Las mismas funciones de lista las usa el push a Notion (`notion-specs.ts` llama a
 * `listReviewItems`, `listLearningItems` y `listAssets` para saber qué empujar): un tope ciego ahí dejaría de
 * sincronizar en silencio a partir de la fila N, que es mucho peor que una lista larga. Por eso el límite lo
 * pasa **quien pinta la página**, nunca la consulta por su cuenta.
 *
 * Cuando una lista lo alcanza, `RecordTable` lo dice en pantalla (`truncatedAt`): recortar sin avisar sería
 * mentir sobre lo que hay.
 */
export const LIST_LIMIT = 500;

/**
 * Traduce un tope opcional al número que espera `.limit()` de Drizzle.
 *
 * En runtime `.limit(undefined)` omite la cláusula —comprobado con `toSQL()`— pero su tipo no admite
 * `undefined`, así que sin esto haría falta un `as` en cada consulta. Se devuelve un tope enorme en su lugar:
 * Postgres lo trata como "sin límite" y el plan no cambia.
 */
export function rowCap(limit?: number): number {
  return limit ?? Number.MAX_SAFE_INTEGER;
}
