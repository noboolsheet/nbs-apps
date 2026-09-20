import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getLearningItem, updateLearningItem, deleteLearningItem } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await getLearningItem(getDb(), org, id);
    return NextResponse.json({ data });
  });
}

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await updateLearningItem(getDb(), org, id, await readJson(req));
    return NextResponse.json({ data });
  });
}

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    await deleteLearningItem(getDb(), org, id);
    return NextResponse.json({ data: { ok: true } });
  });
}
