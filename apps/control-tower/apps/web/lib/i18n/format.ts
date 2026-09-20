import { resolveLocale, type Locale } from './index';

/**
 * Formato de fechas y horas de la interfaz. Punto ÚNICO: ninguna vista debe llamar a `toLocaleDateString()` a pelo,
 * porque sin locale explícito el navegador usa el suyo y en un equipo en inglés salía `12/31/2026` (mes primero).
 *
 * Español → **día/mes/año**. Al añadir un idioma basta con darle su etiqueta BCP-47 en `LOCALE_TAG`.
 */
const LOCALE_TAG: Record<Locale, string> = { es: 'es-ES' };

/** Fechas "de calendario" de Postgres (`date`) llegan como 'YYYY-MM-DD'. */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Fecha corta: `31/12/2026`.
 *
 * Ojo con las fechas de sólo día: `new Date('2026-12-31')` se interpreta como medianoche **UTC**, así que en un
 * huso al oeste se mostraría el 30. Por eso se reordena el literal en vez de construir un `Date`.
 */
export function formatDate(value: Date | string | null | undefined): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'string') {
    const m = DATE_ONLY.exec(value);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(LOCALE_TAG[resolveLocale()], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/** Fecha + hora: `31/12/2026, 14:05`. Para marcas de tiempo (creado, actualizado, actividad). */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (value == null || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(LOCALE_TAG[resolveLocale()], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Sólo la hora: `14:05`. Para los eventos del día. */
export function formatTime(value: Date | string | null | undefined): string {
  if (value == null || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(LOCALE_TAG[resolveLocale()], { hour: '2-digit', minute: '2-digit' }).format(d);
}
