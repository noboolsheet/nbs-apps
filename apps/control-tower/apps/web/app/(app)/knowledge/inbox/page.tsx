import Link from 'next/link';
import { getDb } from '@ct/db';
import { listInbox, listInboxChannels } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { EntityTable, type Column } from '@/components/ui/entity-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { SourceBadge } from '@/components/ui/source-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { CaptureForm } from '@/components/knowledge/forms';
import { RecordLink } from '@/components/ui/record-link';
import { InboxChannels } from '@/components/knowledge/inbox-channels';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

type InboxItem = Awaited<ReturnType<typeof listInbox>>[number];

export default async function InboxPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const db = getDb();
  const [rows, channels] = await Promise.all([listInbox(db, ctx.org), listInboxChannels(db, ctx.org)]);
  const canManage = ctx.org.role === 'OWNER';

  const columns: Column<InboxItem>[] = [
    {
      header: t('entity.knowledge_inbox'),
      cell: (r) => (
        <RecordLink entity="knowledge_inbox" id={r.id} className="line-clamp-2 text-fg hover:underline">
          {r.title ?? r.rawContent.slice(0, 120)}
        </RecordLink>
      ),
      className: 'w-full',
    },
    { header: t('field.sourceType'), cell: (r) => <SourceBadge source={r.sourceType} url={r.sourceUrl} />, className: 'whitespace-nowrap' },
    { header: t('field.status'), cell: (r) => <StatusBadge status={r.status} />, className: 'whitespace-nowrap' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/knowledge">{t('nav.knowledge')}</Link> / {t('knowledge.inbox')}
      </nav>
      <h1 className="text-2xl font-semibold tracking-tight">{t('knowledge.bandejaDeConocimiento')} <span className="font-normal text-fg-subtle">({rows.length})</span></h1>
      <CaptureForm />

      <section className="flex flex-col gap-2 rounded-lg border border-line p-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('knowledge.canalesDeCaptura')}</h2>
        <p className="text-xs text-fg-muted">{t('knowledge.conectaHerramientasExternasN8nEmailExten')}</p>
        <InboxChannels channels={channels} canManage={canManage} />
      </section>

      {rows.length === 0 ? (
        <EmptyState title={t('knowledge.tuInboxEstaVacio')} hint={t('knowledge.capturaUnaIdeaConElFormularioDeArriba')} />
      ) : (
        <EntityTable columns={columns} rows={rows} getKey={(r) => r.id} />
      )}
    </div>
  );
}
