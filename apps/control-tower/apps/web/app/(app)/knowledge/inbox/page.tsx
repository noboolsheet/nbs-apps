import Link from 'next/link';
import { getDb } from '@ct/db';
import { LIST_LIMIT, listInbox, listInboxChannels } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { SourceBadge } from '@/components/ui/source-badge';
import { CaptureForm } from '@/components/knowledge/forms';
import { RecordLink } from '@/components/ui/record-link';
import { InboxChannels } from '@/components/knowledge/inbox-channels';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

type InboxItem = Awaited<ReturnType<typeof listInbox>>[number];

export default async function InboxPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const db = getDb();
  const [rows, channels] = await Promise.all([listInbox(db, ctx.org, LIST_LIMIT), listInboxChannels(db, ctx.org)]);
  const canManage = ctx.org.role === 'OWNER';

  const columns: Column<InboxItem>[] = [
    {
      header: t('entity.knowledge_inbox'),
      value: (r) => r.title ?? r.rawContent,
      cell: (r) => (
        <RecordLink entity="knowledge_inbox" id={r.id} className="line-clamp-2 text-fg hover:underline">
          {r.title ?? r.rawContent.slice(0, 120)}
        </RecordLink>
      ),
      className: 'w-full',
    },
    { header: t('field.sourceType'), value: (r) => r.sourceType, facet: true, cell: (r) => <SourceBadge source={r.sourceType} url={r.sourceUrl} />, className: 'whitespace-nowrap' },
    { header: t('field.status'), value: (r) => enumLabel(r.status), facet: true, cell: (r) => <StatusBadge status={r.status} />, className: 'whitespace-nowrap' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/knowledge">{t('nav.knowledge')}</Link> / {t('knowledge.inbox')}
      </nav>
      <h1 className="text-2xl font-semibold tracking-tight">{t('knowledge.inboxTitle')} <span className="font-normal text-fg-subtle">({rows.length})</span></h1>
      <CaptureForm />

      <section className="flex flex-col gap-2 rounded-lg border border-line p-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('knowledge.captureChannelsTitle')}</h2>
        <p className="text-xs text-fg-muted">{t('knowledge.captureChannelsHint')}</p>
        <InboxChannels channels={channels} canManage={canManage} />
      </section>

      {/* `RecordTable` en vez de `EntityTable`: así la bandeja gana orden por columna, buscador y facetas como
          el resto de las listas. Con `EntityTable` no tenía ninguna de las tres. */}
      <RecordTable
        columns={columns}
        rows={rows}
        truncatedAt={LIST_LIMIT}
        getKey={(r) => r.id}
        empty={{ title: t('knowledge.inboxEmpty'), hint: t('knowledge.inboxEmptyHint') }}
      />
    </div>
  );
}
