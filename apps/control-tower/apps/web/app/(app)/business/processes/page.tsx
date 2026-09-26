import Link from 'next/link';
import { getDb } from '@ct/db';
import { listKnowledgeItems } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { EmptyState } from '@/components/ui/empty-state';
import { NewRecordButton } from '@/components/ui/new-record-button';
import { LibraryList } from '@/components/knowledge/library-list';
import { notionUrlsByKnowledgeItem } from '@/lib/knowledge-notion-urls';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * **Negocio › Procesos (SOP)** — owner 2026-09-02.
 *
 * Un SOP NO es una entidad propia: es un `knowledge_item` con `knowledgeType = PROCESS`. Se descartó crear una
 * tabla nueva porque habría duplicado lo que la biblioteca ya da —ciclo editorial (borrador → revisión →
 * aprobado), sector, buscador, auditoría y espejo bidireccional con Notion— y lo que faltaba era **sitio**, no
 * modelo: los procesos son gobierno del negocio, no material de consulta, así que su puerta de entrada vive en
 * Negocio aunque el dato siga en Conocimiento.
 *
 * El **cuerpo** del SOP vive en Notion; el campo «URLs relacionadas» apunta a la carpeta de Drive con sus anexos
 * (checklists, formularios). Ver `docs/INFORMATION_ORGANIZATION.md`.
 */
export default async function ProcessesPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const [rows, notionUrls] = await Promise.all([
    listKnowledgeItems(getDb(), ctx.org, { knowledgeType: 'PROCESS' }),
    notionUrlsByKnowledgeItem(ctx.org),
  ]);
  const items = rows.map((r) => ({ ...r, notionUrl: notionUrls.get(r.id) ?? null }));

  return (
    <div className="flex flex-col gap-4">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/business">{t('nav.business')}</Link> / {t('business.processesTitle')}
      </nav>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('business.processesTitle')} <span className="font-normal text-fg-subtle">({rows.length})</span>
        </h1>
        <NewRecordButton entity="knowledge_item" preset="knowledgeType:PROCESS" />
      </div>
      <p className="text-sm text-fg-muted">{t('business.processesHint')}</p>
      {rows.length === 0 ? (
        <EmptyState title={t('business.processesEmpty')} hint={t('business.processesEmptyHint')} />
      ) : (
        <LibraryList items={items} lockedType />
      )}
    </div>
  );
}
