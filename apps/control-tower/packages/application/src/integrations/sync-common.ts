/** Utilidades compartidas por los syncs de integración (resiliencia por-registro, F-13). */

/** Registro que no se pudo sincronizar (no aborta el resto del pull). */
export interface SyncSkip {
  entity: string;
  externalId: string;
  error: string;
}

/** Mensaje corto de error para el summary de skips. */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
