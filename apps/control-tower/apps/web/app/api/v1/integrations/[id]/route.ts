import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { disconnectIntegration, updateIntegrationConfiguration } from '@ct/application';
import { z } from '@ct/validation';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Configuración NO sensible (folderId de Drive, databases de Notion). Los secretos van en env, nunca aquí.
const configSchema = z.object({ configuration: z.record(z.unknown()) });

// Actualiza la configuración (jsonb) de la integración.
export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const { configuration } = configSchema.parse(await readJson(req));
    const data = await updateIntegrationConfiguration(getDb(), org, id, configuration);
    return NextResponse.json({ data });
  });
}

// Desconecta (borra) la integración. El worker deja de sincronizarla; vuelve a "Disponibles".
export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await disconnectIntegration(getDb(), org, id);
    return NextResponse.json({ data });
  });
}
