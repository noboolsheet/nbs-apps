import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { createProjectFromWonOpportunity } from '@ct/application';
import { withContext, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * Crea el proyecto de una oportunidad GANADA, **a petición de la persona**.
 *
 * La automatización que lo hacía sola está suspendida por decisión del owner (2026-09-27): crear un proyecto es una
 * decisión, no un trámite. Así que este endpoint es el «sí, créalo» explícito. Reusa el mismo comando que usaba la
 * automatización, que es **idempotente**: si ya existe el proyecto de esa oportunidad, devuelve el que hay en vez de
 * duplicarlo (dos clics seguidos no crean dos proyectos).
 */
export function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id, 'oportunidad');
    const projectId = await createProjectFromWonOpportunity(getDb(), org, id);
    if (!projectId) {
      return NextResponse.json(
        {
          error: {
            code: 'OPPORTUNITY_NOT_WON',
            kind: 'CONFLICT',
            message: 'Sólo se crea el proyecto de una oportunidad ganada.',
          },
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ data: { projectId } }, { status: 201 });
  });
}
