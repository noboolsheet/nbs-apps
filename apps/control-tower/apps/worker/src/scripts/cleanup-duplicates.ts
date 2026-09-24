/**
 * Limpieza puntual del destrozo que dejó la migración de servidor (Raspberry Pi → vibox), M40.
 *
 * El código nuevo evita que vuelva a pasar, pero no arregla lo que ya está duplicado: eso hay que limpiarlo
 * una vez, a mano, mirando lo que va a tocar antes de tocarlo. Para eso está esto.
 *
 * Qué pasó: la idempotencia de los syncs vive entera en `external_identities`, una tabla LOCAL de CT. Al
 * levantar CT en vibox con la base vacía (sin restaurar el dump), Notion y GitHub seguían llenos, así que el
 * import de Notion creó un asset por página y el sync de GitHub creó OTRO por repo, sin que nada los cruzara.
 * Y como nadie reconciliaba borrados, siguen ahí los repos que ya no existen en GitHub.
 *
 * Cuatro fases, todas en seco por defecto:
 *
 *   A. Identidades huérfanas — punteros a filas que ya no existen. Bloquean que el registro se re-cree.
 *   B. Assets duplicados en CT — mismo repo con dos (o más) filas. Se conserva uno, se le llevan los enlaces
 *      de proyecto y se archivan los demás.
 *   C. Repos muertos — assets REPOSITORY cuya URL ya no está en GitHub (necesita GITHUB_TOKEN).
 *   D. Páginas duplicadas en la base «Assets» de Notion (necesita NOTION_API_KEY).
 *
 * Uso (desde `apps/control-tower/`, o dentro del contenedor del worker):
 *
 *   pnpm --filter @ct/worker exec tsx src/scripts/cleanup-duplicates.ts            # informe, no toca nada
 *   pnpm --filter @ct/worker exec tsx src/scripts/cleanup-duplicates.ts --apply    # aplica
 *   …                                                             --only=A,B       # sólo algunas fases
 *
 * En el SERVIDOR va dentro del contenedor del worker, y por nombre: allí `docker compose` a secas no encuentra
 * el stack (se levanta con `-f control-tower.docker-compose.<perfil>.yml` y su propio `name:`). Además la imagen
 * es horneada, así que hace falta desplegar antes para que el script exista dentro:
 *
 *   ./deploy-control-tower.sh prod
 *   W=$(docker ps --filter name=worker --format '{{.Names}}' | grep control-tower)
 *   docker exec -it "$W" pnpm --filter @ct/worker exec tsx src/scripts/cleanup-duplicates.ts
 *
 * Variables: DATABASE_URL (obligatoria) · GITHUB_TOKEN + GITHUB_OWNER (fase C) · NOTION_API_KEY (fase D).
 * **Haz un `pg_dump` antes de correrlo con `--apply`.** Lo que archiva es reversible desde Ajustes ›
 * Archivados; lo que borra son punteros de sync, que se regeneran solos en el siguiente sync.
 */
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';

const APPLY = process.argv.includes('--apply');
/** `--only=A,B` ⇒ sólo esas fases. Se compara por letra, así que el separador da igual. */
const ONLY = (process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length) ?? 'ABCD').toUpperCase();

const db = getDb();

let planned = 0;
function say(line = ''): void {
  console.log(line);
}
function action(line: string): void {
  planned++;
  console.log(`  ${APPLY ? '·' : '→'} ${line}`);
}

/** Normaliza una URL de repo para comparar: sin protocolo, sin `.git`, sin barra final, en minúsculas. */
function repoKey(...urls: (string | null | undefined)[]): string | null {
  for (const u of urls) {
    if (!u) continue;
    const k = u
      .trim()
      .toLowerCase()
      .replace(/^[a-z]+:\/\//, '')
      .replace(/^git@([^:]+):/, '$1/')
      .replace(/\.git$/, '')
      .replace(/\/+$/, '');
    if (k) return k;
  }
  return null;
}

/** La organización sobre la que se trabaja: la única que hay, o la del env ORGANIZATION_ID. */
async function resolveOrganizationId(): Promise<string> {
  const fromEnv = process.env.ORGANIZATION_ID;
  if (fromEnv) return fromEnv;
  const rows = await db.select({ id: s.organizations.id, name: s.organizations.name }).from(s.organizations);
  if (rows.length === 1) return rows[0]!.id;
  throw new Error(
    `Hay ${rows.length} organizaciones (${rows.map((r) => r.name).join(', ')}); indica cuál con ORGANIZATION_ID=<uuid>`,
  );
}

// ---------------------------------------------------------------------------------------------------
// Fase A — identidades huérfanas
// ---------------------------------------------------------------------------------------------------

/** internal_type → tabla, para saber si el registro al que apunta una identidad sigue existiendo. */
type Target = { table: PgTable; id: AnyPgColumn; org: AnyPgColumn };
const TABLES: Record<string, Target> = {
  asset: { table: s.assets, id: s.assets.id, org: s.assets.organizationId },
  client: { table: s.clients, id: s.clients.id, org: s.clients.organizationId },
  contact: { table: s.contacts, id: s.contacts.id, org: s.contacts.organizationId },
  opportunity: { table: s.opportunities, id: s.opportunities.id, org: s.opportunities.organizationId },
  task: { table: s.tasks, id: s.tasks.id, org: s.tasks.organizationId },
  project: { table: s.projects, id: s.projects.id, org: s.projects.organizationId },
  document: { table: s.documents, id: s.documents.id, org: s.documents.organizationId },
  decision: { table: s.decisions, id: s.decisions.id, org: s.decisions.organizationId },
  knowledge_item: { table: s.knowledgeItems, id: s.knowledgeItems.id, org: s.knowledgeItems.organizationId },
  strategic_area: { table: s.strategicAreas, id: s.strategicAreas.id, org: s.strategicAreas.organizationId },
  goal: { table: s.goals, id: s.goals.id, org: s.goals.organizationId },
  capability: { table: s.capabilities, id: s.capabilities.id, org: s.capabilities.organizationId },
  service: { table: s.services, id: s.services.id, org: s.services.organizationId },
  resource: { table: s.resources, id: s.resources.id, org: s.resources.organizationId },
  learning_item: { table: s.learningItems, id: s.learningItems.id, org: s.learningItems.organizationId },
  review_item: { table: s.reviewItems, id: s.reviewItems.id, org: s.reviewItems.organizationId },
};

async function phaseOrphanIdentities(orgId: string): Promise<void> {
  say('── A · Identidades de sync huérfanas ─────────────────────────────────────');
  const identities = await db
    .select()
    .from(s.externalIdentities)
    .where(eq(s.externalIdentities.organizationId, orgId));

  const orphanIds: string[] = [];
  const unknownTypes = new Set<string>();
  for (const [internalType, group] of Object.entries(
    identities.reduce<Record<string, typeof identities>>((acc, i) => {
      (acc[i.internalType] ??= []).push(i);
      return acc;
    }, {}),
  )) {
    const table = TABLES[internalType];
    if (!table) {
      unknownTypes.add(internalType);
      continue;
    }
    const ids = group.map((g) => g.internalId);
    const alive = (await db
      .select({ id: table.id })
      .from(table.table)
      .where(and(eq(table.org, orgId), inArray(table.id, ids)))) as { id: string }[];
    const aliveIds = new Set(alive.map((a) => String(a.id)));
    for (const g of group) if (!aliveIds.has(g.internalId)) orphanIds.push(g.id);
  }

  if (unknownTypes.size > 0) say(`  (tipos no reconocidos, se dejan como están: ${[...unknownTypes].join(', ')})`);
  if (orphanIds.length === 0) {
    say('  Nada que limpiar.');
    return say();
  }
  action(`borrar ${orphanIds.length} identidades que apuntan a filas inexistentes`);
  if (APPLY) await db.delete(s.externalIdentities).where(inArray(s.externalIdentities.id, orphanIds));
  say();
}

// ---------------------------------------------------------------------------------------------------
// Fase B — assets duplicados en CT
// ---------------------------------------------------------------------------------------------------

async function phaseDuplicateAssets(orgId: string): Promise<void> {
  say('── B · Reutilizables duplicados en Control Tower ─────────────────────────');
  const rows = await db.select().from(s.assets).where(eq(s.assets.organizationId, orgId));
  const identities = await db
    .select()
    .from(s.externalIdentities)
    .where(and(eq(s.externalIdentities.organizationId, orgId), eq(s.externalIdentities.internalType, 'asset')));
  const githubOf = new Map(identities.filter((i) => i.provider === 'GITHUB').map((i) => [i.internalId, i]));

  // Se agrupa por URL de repo; si no la hay, por nombre + tipo (las páginas duplicadas de Notion que no eran
  // repos). Sólo se considera duplicado un grupo con más de una fila.
  const groups = new Map<string, typeof rows>();
  for (const a of rows) {
    const key = repoKey(a.repositoryUrl, a.externalUrl) ?? `name:${a.name.trim().toLowerCase()}|${a.assetType}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(a);
    groups.set(key, bucket);
  }

  let found = 0;
  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    found++;
    // Canónico: el que ya está vinculado a GitHub; si no, el vivo más antiguo; si no, el más antiguo.
    const sorted = [...group].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const canonical =
      sorted.find((a) => githubOf.has(a.id)) ?? sorted.find((a) => !a.archivedAt) ?? sorted[0]!;
    const dupes = sorted.filter((a) => a.id !== canonical.id);

    say(`  «${canonical.name}» (${key}) — ${group.length} copias`);
    action(`conservar ${canonical.id} y archivar ${dupes.length}: ${dupes.map((d) => d.name).join(', ')}`);

    for (const d of dupes) {
      // 1) Enlaces proyecto↔asset: se pasan al canónico, saltando los que ya existen (UNIQUE).
      const links = await db.select().from(s.projectAssets).where(eq(s.projectAssets.assetId, d.id));
      for (const l of links) {
        const [already] = await db
          .select({ id: s.projectAssets.id })
          .from(s.projectAssets)
          .where(and(eq(s.projectAssets.projectId, l.projectId), eq(s.projectAssets.assetId, canonical.id)));
        action(
          already
            ? `enlace de proyecto duplicado ${l.id} → borrar (el canónico ya está en ese proyecto)`
            : `enlace de proyecto ${l.id} → mover al canónico`,
        );
        if (APPLY) {
          if (already) await db.delete(s.projectAssets).where(eq(s.projectAssets.id, l.id));
          else await db.update(s.projectAssets).set({ assetId: canonical.id }).where(eq(s.projectAssets.id, l.id));
        }
      }
      // 2) Portafolio.
      const portfolio = await db
        .select({ id: s.portfolioItems.id })
        .from(s.portfolioItems)
        .where(and(eq(s.portfolioItems.organizationId, orgId), eq(s.portfolioItems.assetId, d.id)));
      for (const p of portfolio) {
        action(`item de portafolio ${p.id} → apuntar al canónico`);
        if (APPLY) await db.update(s.portfolioItems).set({ assetId: canonical.id }).where(eq(s.portfolioItems.id, p.id));
      }
      // 3) Identidades del duplicado: se borran. Las de Notion porque su página se archiva en la fase D; las
      //    de GitHub porque el canónico ya tiene la suya (o la recreará el siguiente sync por adopción).
      const dupIdentities = identities.filter((i) => i.internalId === d.id);
      for (const i of dupIdentities) {
        action(`identidad ${i.provider}/${i.externalId} del duplicado → borrar`);
        if (APPLY) await db.delete(s.externalIdentities).where(eq(s.externalIdentities.id, i.id));
      }
      // 4) El duplicado se archiva (reversible), no se borra.
      if (APPLY && !d.archivedAt) {
        await db.update(s.assets).set({ archivedAt: new Date() }).where(eq(s.assets.id, d.id));
      }
    }
  }
  if (found === 0) say('  Nada que limpiar.');
  say();
}

// ---------------------------------------------------------------------------------------------------
// Fase C — repos que ya no existen en GitHub
// ---------------------------------------------------------------------------------------------------

async function githubRepoKeys(): Promise<Set<string> | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    say('  (sin GITHUB_TOKEN: fase omitida)');
    return null;
  }
  const owner = process.env.GITHUB_OWNER;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const keys = new Set<string>();
  let url: string | null = `https://api.github.com${owner ? `/users/${owner}/repos` : '/user/repos'}?per_page=100`;
  for (let page = 0; url && page < 50; page++) {
    const res: Response = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GitHub repos → HTTP ${res.status}`);
    for (const r of (await res.json()) as { html_url?: string; clone_url?: string }[]) {
      const k = repoKey(r.clone_url, r.html_url);
      if (k) keys.add(k);
    }
    const next = res.headers.get('link')?.match(/<([^>]+)>\s*;\s*rel="next"/);
    url = next ? next[1]! : null;
  }
  return keys;
}

async function phaseDeadRepos(orgId: string): Promise<void> {
  say('── C · Reutilizables de repos que ya no están en GitHub ──────────────────');
  const live = await githubRepoKeys();
  if (!live) return say();
  if (live.size === 0) {
    say('  GitHub no devolvió ningún repo; no se toca nada (mismo criterio que la guardia del sync).');
    return say();
  }

  const rows = await db
    .select()
    .from(s.assets)
    .where(and(eq(s.assets.organizationId, orgId), eq(s.assets.assetType, 'REPOSITORY'), isNull(s.assets.archivedAt)));
  const dead = rows.filter((a) => {
    const k = repoKey(a.repositoryUrl, a.externalUrl);
    return k !== null && !live.has(k);
  });
  if (dead.length === 0) {
    say('  Nada que archivar.');
    return say();
  }
  for (const d of dead) action(`archivar «${d.name}» (${repoKey(d.repositoryUrl, d.externalUrl)})`);
  if (APPLY) {
    await db
      .update(s.assets)
      .set({ archivedAt: new Date() })
      .where(inArray(s.assets.id, dead.map((d) => d.id)));
  }
  say();
}

// ---------------------------------------------------------------------------------------------------
// Fase D — páginas duplicadas en la base «Assets» de Notion
// ---------------------------------------------------------------------------------------------------

type NotionPageRow = { id: string; created_time: string; properties: Record<string, unknown> };

function notionText(props: Record<string, unknown>, name: string): string | null {
  const p = props[name] as { type?: string; title?: { plain_text?: string }[]; rich_text?: { plain_text?: string }[]; url?: string } | undefined;
  if (!p) return null;
  if (p.type === 'title') return (p.title ?? []).map((t) => t.plain_text ?? '').join('').trim() || null;
  if (p.type === 'rich_text') return (p.rich_text ?? []).map((t) => t.plain_text ?? '').join('').trim() || null;
  if (p.type === 'url') return p.url ?? null;
  return null;
}

async function phaseNotionDuplicates(orgId: string): Promise<void> {
  say('── D · Páginas duplicadas en la base «Assets» de Notion ──────────────────');
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    say('  (sin NOTION_API_KEY: fase omitida)');
    return say();
  }
  const [integ] = await db
    .select()
    .from(s.integrations)
    .where(and(eq(s.integrations.organizationId, orgId), eq(s.integrations.provider, 'NOTION')));
  const databaseId = (integ?.configuration as { databases?: Record<string, string> } | null)?.databases?.assets;
  if (!databaseId) {
    say('  La integración de Notion no tiene configurada la base `assets`; fase omitida.');
    return say();
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };
  const pages: NotionPageRow[] = [];
  let cursor: string | undefined;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 }),
    });
    if (!res.ok) throw new Error(`Notion query → HTTP ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { results?: NotionPageRow[]; has_more?: boolean; next_cursor?: string | null };
    pages.push(...(json.results ?? []));
    cursor = json.has_more ? (json.next_cursor ?? undefined) : undefined;
  } while (cursor);

  // Las páginas que CT tiene vinculadas: ésas son las que se conservan de cada grupo.
  const linked = new Set(
    (
      await db
        .select({ externalId: s.externalIdentities.externalId })
        .from(s.externalIdentities)
        .where(
          and(
            eq(s.externalIdentities.organizationId, orgId),
            eq(s.externalIdentities.provider, 'NOTION'),
            eq(s.externalIdentities.internalType, 'asset'),
          ),
        )
    ).map((i) => i.externalId),
  );

  const groups = new Map<string, NotionPageRow[]>();
  for (const p of pages) {
    const title = notionText(p.properties, 'Name') ?? notionText(p.properties, 'Título') ?? '(sin título)';
    const key =
      repoKey(notionText(p.properties, 'Repository URL'), notionText(p.properties, 'External URL')) ??
      `name:${title.toLowerCase()}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(p);
    groups.set(key, bucket);
  }

  let found = 0;
  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    found++;
    const sorted = [...group].sort((a, b) => a.created_time.localeCompare(b.created_time));
    const keep = sorted.find((p) => linked.has(p.id)) ?? sorted[0]!;
    const dupes = sorted.filter((p) => p.id !== keep.id);
    say(`  ${key} — ${group.length} páginas`);
    action(`conservar ${keep.id}${linked.has(keep.id) ? ' (vinculada a CT)' : ''} y enviar a la papelera ${dupes.length}`);
    for (const d of dupes) {
      if (APPLY) {
        const res = await fetch(`https://api.notion.com/v1/pages/${d.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ archived: true }),
        });
        if (!res.ok) say(`    ⚠ no se pudo archivar ${d.id}: HTTP ${res.status}`);
      }
      // El puntero de CT a una página que se va a la papelera sobra: si no, el push la actualizaría eternamente.
      if (linked.has(d.id)) {
        action(`identidad NOTION/${d.id} → borrar`);
        if (APPLY) {
          await db
            .delete(s.externalIdentities)
            .where(
              and(
                eq(s.externalIdentities.organizationId, orgId),
                eq(s.externalIdentities.provider, 'NOTION'),
                eq(s.externalIdentities.externalId, d.id),
              ),
            );
        }
      }
    }
  }
  if (found === 0) say('  Nada que limpiar.');
  say();
}

// ---------------------------------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  await db.execute(sql`select 1`);
  const orgId = await resolveOrganizationId();

  say();
  say(`Limpieza de duplicados de sync — organización ${orgId}`);
  say(APPLY ? 'MODO APLICAR: se van a escribir los cambios.' : 'MODO SECO: no se escribe nada (añade --apply).');
  say();

  if (ONLY.includes('A')) await phaseOrphanIdentities(orgId);
  if (ONLY.includes('B')) await phaseDuplicateAssets(orgId);
  if (ONLY.includes('C')) await phaseDeadRepos(orgId);
  if (ONLY.includes('D')) await phaseNotionDuplicates(orgId);

  say('──────────────────────────────────────────────────────────────────────────');
  if (planned === 0) say('No hay nada que hacer.');
  else if (APPLY) say(`${planned} cambios aplicados.`);
  else say(`${planned} cambios propuestos. Repásalos y vuelve a lanzarlo con --apply.`);
  say();
}

main()
  .then(() => closeDb())
  .catch(async (e) => {
    console.error(e);
    await closeDb();
    process.exit(1);
  });
