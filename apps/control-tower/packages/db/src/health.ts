import { getSql } from './client';

/**
 * Chequeo de salud de la base de datos para `/api/health/db`.
 * Devuelve latencia en ms o un error controlado (sin filtrar credenciales).
 */
export interface DbHealth {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

export async function checkDbHealth(databaseUrl?: string): Promise<DbHealth> {
  const started = performance.now();
  try {
    const sql = getSql(databaseUrl);
    await sql`select 1 as ok`;
    return { ok: true, latencyMs: Math.round(performance.now() - started) };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message || (error as { code?: string }).code || error.name || 'connection failed'
        : 'unknown error';
    return { ok: false, error: message };
  }
}
