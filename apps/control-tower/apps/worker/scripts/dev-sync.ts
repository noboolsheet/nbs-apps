/*
 * Util de desarrollo: conecta una integración y encola su job de sync contra la DB local, para probar
 * los pulls sin navegador. El worker (con los secretos en su entorno) ejecuta el job.
 *
 * Uso (desde apps/control-tower):
 *   set -a; . ./.env; set +a                      # carga secretos (o exporta DATABASE_URL a localhost)
 *   DATABASE_URL=postgres://control_tower:control_tower@localhost:5432/control_tower \
 *     pnpm --filter @ct/worker exec tsx scripts/dev-sync.ts <TWENTY|NOTION|GITHUB|GDRIVE|GCALENDAR> [orgId]
 *
 * orgId por defecto: la org semilla `noboolsheet`. También DEV_ORG_ID.
 */
import { getDb, closeDb } from '@ct/db';
import { connectIntegration, enqueueJob, type OrgContext } from '@ct/application';

const KNOWN = ['TWENTY', 'NOTION', 'GITHUB', 'GDRIVE', 'GCALENDAR'] as const;
const DEFAULT_ORG = '00000000-0000-0000-0000-000000000001';

async function main() {
  const provider = (process.argv[2] ?? '').toUpperCase();
  const orgId = process.argv[3] ?? process.env.DEV_ORG_ID ?? DEFAULT_ORG;
  if (!(KNOWN as readonly string[]).includes(provider)) {
    throw new Error(`provider inválido "${provider}". Usa uno de: ${KNOWN.join(', ')}`);
  }

  const db = getDb();
  const ctx: OrgContext = { userId: 'system', organizationId: orgId, role: 'OWNER' };
  const integ = await connectIntegration(db, ctx, { provider, displayName: `${provider} (dev-sync)` });
  const job = await enqueueJob(db, {
    jobType: `integration.${provider.toLowerCase()}.sync`,
    payload: { organizationId: orgId, integrationId: integ.id },
    organizationId: orgId,
  });
  console.log(`integration ${integ.id} (${integ.status}) · job ${job.id} ${job.jobType} ${job.status}`);
  console.log('El worker lo ejecutará en su próximo tick (~2s). Mira sus logs y la tabla jobs/integrations.');
  await closeDb();
}

main().catch((e) => {
  console.error('dev-sync ERROR:', e instanceof Error ? e.message : e);
  process.exit(1);
});
