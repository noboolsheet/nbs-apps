import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { linkServiceCapability } from '@ct/application';
import { linkServiceCapabilitySchema } from '@ct/validation';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const { capabilityId } = linkServiceCapabilitySchema.parse(await readJson(req));
    await linkServiceCapability(getDb(), org, id, capabilityId);
    return NextResponse.json({ data: { ok: true } }, { status: 201 });
  });
}
