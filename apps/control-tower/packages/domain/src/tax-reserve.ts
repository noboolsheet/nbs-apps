/**
 * **Reserva de impuestos**: el porcentaje de lo que te deben que conviene apartar y no gastar.
 *
 * Es una **regla de bolsillo del owner**, no un cálculo fiscal: no conoce el régimen, ni el país, ni los gastos
 * deducibles. Vive en el dominio porque es una regla del negocio y la usan dos pantallas (Pagos e Inicio) — estaba
 * duplicada como constante local en la página de Pagos, y al llevarla a Inicio (owner 2026-09-28) tocaba compartirla
 * antes de tener dos treintas que podrían separarse.
 *
 * El día que dependa del régimen o del país, esto pasa a Ajustes y la función recibe el porcentaje de la
 * organización; por eso `taxReserve` ya lo acepta como parámetro en vez de leer la constante por dentro.
 */
export const TAX_RESERVE_PCT = 30;

/** Lo que hay que apartar de un importe pendiente de cobro. No redondea: lo hace el formateador al pintarlo. */
export function taxReserve(amount: number, pct: number = TAX_RESERVE_PCT): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return (amount * pct) / 100;
}
