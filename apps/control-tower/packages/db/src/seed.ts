import { sql } from 'drizzle-orm';
import { getDb, getSql, closeDb } from './client';
import * as s from './schema/index';
import { logger } from '@ct/shared';

/**
 * Seed determinista de desarrollo (doc old_9 §7 / doc 5 §45). UUIDs fijos → idempotente y
 * seguro de resetear. NO contiene datos reales de clientes. Contenido mínimo:
 * 1 org · 1 user + membership · 1 strategic area · 1 goal · 3 capabilities · 2 services
 * (+ service_capabilities) · 2 clients · 1 contact · 1 opportunity · 3 projects · 1 phase
 * · 5 tasks · 1 deliverable · 2 decisions · 3 knowledge items · 2 assets · 2 portfolio items.
 */

const ID = {
  org: '00000000-0000-0000-0000-000000000001',
  user: '00000000-0000-0000-0000-000000000002',
  area: '00000000-0000-0000-0000-000000000010',
  goal: '00000000-0000-0000-0000-000000000011',
  cap1: '00000000-0000-0000-0000-000000000020',
  cap2: '00000000-0000-0000-0000-000000000021',
  cap3: '00000000-0000-0000-0000-000000000022',
  svc1: '00000000-0000-0000-0000-000000000030',
  svc2: '00000000-0000-0000-0000-000000000031',
  cli1: '00000000-0000-0000-0000-000000000040',
  cli2: '00000000-0000-0000-0000-000000000041',
  con1: '00000000-0000-0000-0000-000000000050',
  opp1: '00000000-0000-0000-0000-000000000060',
  prj1: '00000000-0000-0000-0000-000000000070',
  prj2: '00000000-0000-0000-0000-000000000071',
  prj3: '00000000-0000-0000-0000-000000000072',
  phase1: '00000000-0000-0000-0000-000000000080',
  del1: '00000000-0000-0000-0000-000000000090',
  dec1: '00000000-0000-0000-0000-0000000000a0',
  dec2: '00000000-0000-0000-0000-0000000000a1',
  ki1: '00000000-0000-0000-0000-0000000000b0',
  ki2: '00000000-0000-0000-0000-0000000000b1',
  ki3: '00000000-0000-0000-0000-0000000000b2',
  ast1: '00000000-0000-0000-0000-0000000000c0',
  ast2: '00000000-0000-0000-0000-0000000000c1',
  pf1: '00000000-0000-0000-0000-0000000000d0',
  pf2: '00000000-0000-0000-0000-0000000000d1',
} as const;

const ALL_TABLES = [
  'sessions',
  'accounts',
  'verifications',
  'organizations',
  'users',
  'organization_members',
  'strategic_areas',
  'goals',
  'capabilities',
  'services',
  'service_capabilities',
  'clients',
  'contacts',
  'opportunities',
  'projects',
  'project_phases',
  'tasks',
  'deliverables',
  'decisions',
  'knowledge_inbox',
  'knowledge_items',
  'documents',
  'assets',
  'portfolio_items',
  'external_identities',
  'integrations',
  'automations',
  'jobs',
  'outbox_events',
  'audit_logs',
  'change_events',
];

async function main(): Promise<void> {
  const log = logger.child({ task: 'seed' });
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const db = getDb(url);

  log.info('resetting tables');
  await db.execute(
    sql.raw(`TRUNCATE ${ALL_TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`),
  );

  log.info('seeding');
  await db.insert(s.organizations).values({
    id: ID.org,
    name: 'noboolsheet',
    slug: 'noboolsheet',
    status: 'ACTIVE',
  });
  await db.insert(s.users).values({ id: ID.user, name: 'Owner', email: 'owner@example.com' });
  await db
    .insert(s.organizationMembers)
    .values({ organizationId: ID.org, userId: ID.user, role: 'OWNER' });

  await db
    .insert(s.strategicAreas)
    .values({ id: ID.area, organizationId: ID.org, name: 'Business OS', status: 'ACTIVE' });
  await db.insert(s.goals).values({
    id: ID.goal,
    organizationId: ID.org,
    strategicAreaId: ID.area,
    name: 'Lanzar Control Tower',
    status: 'ACTIVE',
    priority: 'HIGH',
  });

  await db.insert(s.capabilities).values([
    { id: ID.cap1, organizationId: ID.org, name: 'Web Development', status: 'AVAILABLE', maturity: 'ADVANCED' },
    { id: ID.cap2, organizationId: ID.org, name: 'Automation', status: 'DEVELOPING', maturity: 'INTERMEDIATE' },
    { id: ID.cap3, organizationId: ID.org, name: 'AI Integration', status: 'PLANNED', maturity: 'BEGINNER' },
  ]);
  await db.insert(s.services).values([
    { id: ID.svc1, organizationId: ID.org, name: 'Web App Development', slug: 'web-app', status: 'ACTIVE' },
    { id: ID.svc2, organizationId: ID.org, name: 'Automation Consulting', slug: 'automation', status: 'READY' },
  ]);
  await db.insert(s.serviceCapabilities).values([
    { serviceId: ID.svc1, capabilityId: ID.cap1 },
    { serviceId: ID.svc2, capabilityId: ID.cap2 },
  ]);

  await db.insert(s.clients).values([
    { id: ID.cli1, organizationId: ID.org, name: 'Acme Corp', slug: 'acme', status: 'ACTIVE', industry: 'Retail' },
    { id: ID.cli2, organizationId: ID.org, name: 'Globex', slug: 'globex', status: 'ACTIVE', industry: 'Tech' },
  ]);
  await db.insert(s.contacts).values({
    id: ID.con1,
    organizationId: ID.org,
    clientId: ID.cli1,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@acme.example',
    status: 'ACTIVE',
  });
  await db.insert(s.opportunities).values({
    id: ID.opp1,
    organizationId: ID.org,
    clientId: ID.cli1,
    primaryContactId: ID.con1,
    name: 'Acme website revamp',
    stage: 'PROPOSAL_SENT',
    status: 'OPEN',
    estimatedValue: '12000.00',
    currencyCode: 'EUR',
  });

  await db.insert(s.projects).values([
    { id: ID.prj1, organizationId: ID.org, clientId: ID.cli1, serviceId: ID.svc1, name: 'Acme Website', slug: 'acme-website', status: 'ACTIVE', priority: 'HIGH' },
    { id: ID.prj2, organizationId: ID.org, clientId: ID.cli2, serviceId: ID.svc1, name: 'Globex Portal', slug: 'globex-portal', status: 'PLANNED', priority: 'MEDIUM' },
    { id: ID.prj3, organizationId: ID.org, serviceId: ID.svc2, name: 'Internal Automation', slug: 'internal-automation', status: 'ACTIVE', priority: 'LOW' },
  ]);
  await db.insert(s.projectPhases).values({
    id: ID.phase1,
    projectId: ID.prj1,
    name: 'Build',
    status: 'ACTIVE',
    sortOrder: 1,
  });
  await db
    .update(s.projects)
    .set({ currentPhaseId: ID.phase1 })
    .where(sql`${s.projects.id} = ${ID.prj1}`);

  await db.insert(s.tasks).values([
    { organizationId: ID.org, projectId: ID.prj1, title: 'Diseñar home', status: 'DONE', priority: 'HIGH' },
    { organizationId: ID.org, projectId: ID.prj1, title: 'Implementar auth', status: 'IN_PROGRESS', priority: 'HIGH' },
    { organizationId: ID.org, projectId: ID.prj1, title: 'Deploy staging', status: 'TODO', priority: 'MEDIUM' },
    { organizationId: ID.org, projectId: ID.prj2, title: 'Kickoff', status: 'TODO', priority: 'MEDIUM' },
    { organizationId: ID.org, projectId: ID.prj3, title: 'Definir triggers', status: 'BLOCKED', priority: 'LOW' },
  ]);
  await db.insert(s.deliverables).values({
    id: ID.del1,
    organizationId: ID.org,
    projectId: ID.prj1,
    name: 'Sitio en producción',
    status: 'IN_PROGRESS',
  });

  await db.insert(s.decisions).values([
    { id: ID.dec1, organizationId: ID.org, projectId: ID.prj1, title: 'Usar Next.js', decision: 'Next.js App Router', status: 'APPROVED' },
    { id: ID.dec2, organizationId: ID.org, title: 'Postgres como única DB', decision: 'PostgreSQL 18', status: 'APPROVED' },
  ]);

  await db.insert(s.knowledgeItems).values([
    { id: ID.ki1, organizationId: ID.org, title: 'Patrón outbox', knowledgeType: 'PATTERN', status: 'APPROVED', sourceType: 'MANUAL' },
    { id: ID.ki2, organizationId: ID.org, title: 'Lección: deploy ARM', knowledgeType: 'LESSON', status: 'REVIEW', sourceType: 'MANUAL' },
    { id: ID.ki3, organizationId: ID.org, title: 'Nota: idempotencia sync', knowledgeType: 'NOTE', status: 'INBOX', sourceType: 'MANUAL' },
  ]);
  await db.insert(s.knowledgeInbox).values({
    organizationId: ID.org,
    rawContent: 'Idea capturada desde ChatGPT sobre onboarding',
    sourceType: 'CHATGPT',
    status: 'NEW',
  });

  await db.insert(s.assets).values([
    { id: ID.ast1, organizationId: ID.org, name: 'Landing template', assetType: 'TEMPLATE', status: 'ACTIVE' },
    { id: ID.ast2, organizationId: ID.org, name: 'Deploy script', assetType: 'SCRIPT', status: 'ACTIVE' },
  ]);
  await db.insert(s.portfolioItems).values([
    { id: ID.pf1, organizationId: ID.org, name: 'Acme Website', type: 'CaseStudy', status: 'CANDIDATE', projectId: ID.prj1, visibility: 'INTERNAL' },
    { id: ID.pf2, organizationId: ID.org, name: 'Landing template demo', type: 'Template', status: 'PUBLISHED', assetId: ID.ast1, visibility: 'PUBLISHABLE' },
  ]);

  log.info('seed complete');
  await closeDb();
}

void main().catch((error) => {
  logger.error('seed failed', { error: error instanceof Error ? error.message : String(error) });
  void getSql;
  process.exit(1);
});
