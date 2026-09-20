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

export default async function LibraryPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const [rows, notionUrls] = await Promise.all([
    listKnowledgeItems(getDb(), ctx.org),
    notionUrlsByKnowledgeItem(ctx.org),
  ]);
  const items = rows.map((r) => ({ ...r, notionUrl: notionUrls.get(r.id) ?? null }));

  return (
    <div className="flex flex-col gap-4">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/knowledge">{t('nav.knowledge')}</Link> / {t('knowledge.biblioteca')}
      </nav>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('knowledge.bibliotecaDeConocimiento')} <span className="font-normal text-fg-subtle">({rows.length})</span></h1>
        <NewRecordButton entity="knowledge_item" />
      </div>
      {rows.length === 0 ? (
        <EmptyState title={t('knowledge.aunNoHayConocimiento')} hint={t('knowledge.creaUnoConNuevoOPromueveCapturasDesdeElI')} />
      ) : (
        <LibraryList items={items} />
      )}
    </div>
  );
}
