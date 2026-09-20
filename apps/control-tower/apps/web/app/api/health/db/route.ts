import { NextResponse } from 'next/server';
import { checkDbHealth } from '@ct/db';

export const dynamic = 'force-dynamic';

/** Readiness check: verifica conectividad con PostgreSQL (doc 3 §29: /health/db). */
export async function GET() {
  const health = await checkDbHealth();
  // No se expone `health.error` (mensaje crudo de Postgres: host/DB/detalle de conexión) a un cliente NO autenticado.
  return NextResponse.json(
    {
      status: health.ok ? 'ok' : 'error',
      db: { ok: health.ok },
      time: new Date().toISOString(),
    },
    { status: health.ok ? 200 : 503 },
  );
}
