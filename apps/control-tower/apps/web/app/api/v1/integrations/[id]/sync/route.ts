import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listIntegrations, enqueueJob } from '@ct/application';
import { withContext, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Encola un job de sync para la integración. El worker lo ejecuta (apunta al Twenty self-hosted).
export function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const integrations = await listIntegrations(getDb(), org);
    const integration = integrations.find((i) => i.id === id);
    if (!integration) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', kind: 'NOT_FOUND', message: 'integration no encontrada' } },
        { status: 404 },
      );
    }
    const job = await enqueueJob(getDb(), {
      jobType: `integration.${integration.provider.toLowerCase()}.sync`,
      payload: { organizationId: org.organizationId, integrationId: id },
      organizationId: org.organizationId,
    });
    return NextResponse.json({ data: { jobId: job.id, jobType: job.jobType } }, { status: 202 });
  });
}
