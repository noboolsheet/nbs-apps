import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { deleteTasks } from '@ct/application';
import { z } from '@ct/validation';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Borrado DEFINITIVO en lote. De momento solo tareas/subtareas (en tareas se borra, no se archiva).
const schema = z.object({ entityType: z.literal('task'), ids: z.array(z.string().uuid()).min(1).max(200) });

/** Borrado en lote. Body: { entityType: 'task', ids: string[] }. Requiere rol delete (ADMIN+). */
export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const { ids } = schema.parse(await readJson(req));
    const { deleted } = await deleteTasks(getDb(), org, ids);
    return NextResponse.json({ data: { deleted } });
  });
}
