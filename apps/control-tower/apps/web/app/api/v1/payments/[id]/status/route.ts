import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { updatePaymentStatus } from '@ct/application';
import { updatePaymentStatusSchema } from '@ct/validation';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Marca el pago como pagado o pendiente. */
export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const { status } = updatePaymentStatusSchema.parse(await readJson(req));
    const data = await updatePaymentStatus(getDb(), org, id, status);
    return NextResponse.json({ data });
  });
}
