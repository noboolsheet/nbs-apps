import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listIntegrations, connectIntegration } from '@ct/application';
import { z } from '@ct/validation';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

const connectSchema = z.object({
  provider: z.string().trim().min(1).max(60),
  displayName: z.string().trim().min(1).max(120),
});

export function GET() {
  return withContext(async ({ org }) =>
    NextResponse.json({ data: await listIntegrations(getDb(), org) }),
  );
}

export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const input = connectSchema.parse(await readJson(req));
    const data = await connectIntegration(getDb(), org, input);
    return NextResponse.json({ data }, { status: 201 });
  });
}
