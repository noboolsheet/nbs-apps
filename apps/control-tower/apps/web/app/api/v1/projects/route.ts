import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listProjects, createProject } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET() {
  return withContext(async ({ org }) => {
    const data = await listProjects(getDb(), org);
    return NextResponse.json({ data });
  });
}

export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const data = await createProject(getDb(), org, await readJson(req));
    return NextResponse.json({ data }, { status: 201 });
  });
}
