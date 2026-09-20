/**
 * Monedas seleccionables (ISO 4217). Fuente ÚNICA para todos los desplegables de moneda: ajustes de la organización
 * (moneda por defecto), panel/ficha de oportunidad, etc. El valor guardado es el código de 3 letras (lo que exige la
 * validación `currencyCode`); aquí solo se listan las opciones. Amplía la lista añadiendo códigos.
 *
 * Lista curada de las monedas más habituales (majors + LATAM/Europa) — cubre los casos reales sin ser exhaustiva.
 */
export const CURRENCIES = [
  'EUR',
  'USD',
  'GBP',
  'CHF',
  'CAD',
  'AUD',
  'JPY',
  'CNY',
  'ARS',
  'MXN',
  'COP',
  'CLP',
  'BRL',
  'PEN',
  'UYU',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'INR',
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

/**
 * Opciones de moneda que SIEMPRE incluyen el valor actual, aunque no esté en la lista curada (p. ej. una moneda
 * importada de Twenty). Evita que el desplegable "pierda" o silencie un valor ya guardado.
 */
export function currencyOptions(current?: string | null): readonly string[] {
  if (current && !CURRENCIES.includes(current as CurrencyCode)) return [current, ...CURRENCIES];
  return CURRENCIES;
}
