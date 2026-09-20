import { es } from './es';

/**
 * i18n de Control Tower (E-10).
 *
 * **Qué entra aquí:** el texto que pertenece a la APLICACIÓN — títulos, subtítulos, etiquetas de campo,
 * nombres de las entidades, botones, ayudas, estados vacíos y mensajes de la UI.
 * **Qué NO entra jamás:** los datos del usuario ni lo importado de terceros (nombres de clientes, títulos de
 * tareas, texto de Notion/Twenty…). Eso se muestra tal cual, sin traducir.
 *
 * Hoy sólo hay un idioma (español). La estructura ya está lista para añadir otro:
 *   1. copia `es.ts` a `<locale>.ts` y traduce los valores (las CLAVES no se tocan);
 *   2. regístralo en `dictionaries` y en `LOCALES`;
 *   3. haz que `resolveLocale()` devuelva la preferencia real (organización o usuario) en vez de la constante.
 * El test `i18n.test.ts` comprueba que todos los diccionarios tienen exactamente las mismas claves, así que
 * un idioma incompleto se detecta en CI, no en producción.
 */
export const LOCALES = ['es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

export const dictionaries: Record<Locale, Dictionary> = { es };
export type Dictionary = Record<string, string>;
export type MessageKey = keyof typeof es;

/**
 * Idioma activo. Punto ÚNICO de extensión para el multiidioma: cuando haya más de uno, aquí se leerá la
 * preferencia (p. ej. `organizations.settings.locale`) en vez de devolver la constante.
 */
export function resolveLocale(): Locale {
  return DEFAULT_LOCALE;
}

/**
 * Traduce una clave. Con `vars` interpola `{nombre}` (los valores se insertan tal cual: si son datos del
 * usuario, siguen sin traducirse). Si la clave falta, devuelve la clave misma — así un olvido se ve en
 * pantalla en vez de romper el render.
 */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const dict = dictionaries[resolveLocale()];
  const raw = dict[key as string] ?? (key as string);
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = vars[name];
    return v === undefined ? m : String(v);
  });
}

/**
 * Plural simple: elige `<base>.one` o `<base>.other` según `n`, e interpola `{n}`. Dos claves por mensaje en
 * vez de concatenar sufijos en el código, porque el plural no funciona igual en todos los idiomas (y en varios
 * la frase entera cambia). Ejemplo: `tPlural('table.confirmArchive', 3)`.
 */
export function tPlural(base: string, n: number, vars?: Record<string, string | number>): string {
  const key = `${base}.${n === 1 ? 'one' : 'other'}` as MessageKey;
  return t(key, { n, ...vars });
}

/**
 * Variante para claves DINÁMICAS (las que se construyen en runtime, como `enum.${code}`): devuelve
 * `undefined` si no existe, para que el llamador decida el respaldo. La usa `enumLabel`, que ante un código
 * desconocido (texto libre del usuario, dato importado) muestra el valor original sin tocar.
 */
export function tOptional(key: string): string | undefined {
  return dictionaries[resolveLocale()][key];
}
