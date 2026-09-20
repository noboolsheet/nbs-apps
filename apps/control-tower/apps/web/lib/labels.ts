import { tOptional } from './i18n';

/**
 * Etiquetas de los CÓDIGOS de enum del dominio (`@ct/domain` / `@ct/validation`).
 *
 * Los códigos (p. ej. `IN_PROGRESS`, `LEAD`, `WON`) son el valor canónico que viaja a la DB/API y NO se
 * traduce jamás: sólo se traduce su REPRESENTACIÓN en pantalla. Desde E-10 las etiquetas viven en el
 * diccionario de i18n (`lib/i18n/es.ts`, claves `enum.<CODIGO>`), igual que el resto del texto de la app;
 * este módulo es el punto de entrada que usan las vistas (`enumLabel`).
 *
 * Si el código no está en el diccionario se devuelve TAL CUAL. Es intencional: los campos de texto libre
 * (tipos/sectores que escribe el usuario) y los datos importados de terceros (Twenty/Notion/…) pasan sin
 * traducir, cumpliendo la regla "lo introducido por el usuario o importado se queda como está".
 *
 * Colisiones de código entre enums (p. ej. `ACTIVE` aparece en cliente, servicio, integración…): se resuelven
 * a una única forma genérica (masculina/invariable). Imperfección de género aceptada a cambio de un mapa simple.
 *
 * **Al añadir un enum cerrado nuevo que se muestre, añade sus códigos a `lib/i18n/es.ts` como `enum.<CODIGO>`.**
 */
export function enumLabel(code: string | null | undefined): string {
  if (code == null || code === '') return '';
  return tOptional(`enum.${code}`) ?? code;
}
