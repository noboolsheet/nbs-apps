import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { updateProfile } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Edición del perfil propio (nombre y email). Siempre sobre el usuario de la sesión. */
export function PATCH(req: Request) {
  return withContext(async ({ org }) => {
    const data = await updateProfile(getDb(), org, await readJson(req));
    return NextResponse.json({ data });
  });
}
