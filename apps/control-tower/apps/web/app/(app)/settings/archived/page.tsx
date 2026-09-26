import type { ReactNode } from 'react';
import Link from 'next/link';
import { getDb } from '@ct/db';
import { listArchived } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { RecordTable } from '@/components/ui/record-table';
import { EmptyState } from '@/components/ui/empty-state';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

function fmt(d: Date | string | null): string {
  if (!d) return '—';
  return formatDateTime(d);
}

export default async function ArchivedPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const groups = await listArchived(getDb(), ctx.org);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/settings">{t('nav.settings')}</Link> / {t('settings.archivedTitle')}
      </nav>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings.archivedTitle')}</h1>
        <p className="text-sm text-fg-muted">{t('settings.archivedHint')}</p>
      </div>

      {groups.length === 0 ? (
        <EmptyState title={t('settings.archivedEmpty')} hint={t('settings.archivedEmptyHint')} />
      ) : (
        groups.map((g) => {
          const columns: { header: string; className?: string; cell: (it: (typeof g.items)[number]) => ReactNode }[] = [
            { header: t('field.name'), cell: (it) => it.name ?? <span className="text-fg-subtle">(sin nombre)</span> },
            { header: t('settings.archivedAt'), className: 'w-48', cell: (it) => <span className="text-xs text-fg-muted">{fmt(it.archivedAt)}</span> },
          ];
          return (
            <section key={g.entityType} className="flex flex-col gap-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">
                {g.label} ({g.items.length})
              </h2>
              <RecordTable
                columns={columns}
                rows={g.items}
                getKey={(it) => it.id}
                selectable
                restore={{ entityType: g.entityType }}
              />
            </section>
          );
        })
      )}
    </div>
  );
}
