import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getPortfolioItem } from '@ct/application';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { ExternalSourceLink } from '@/components/ui/external-source-link';
import { PortfolioStatusControl, PortfolioVisibilityControl } from '@/components/portfolio/forms';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function PortfolioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let item: Awaited<ReturnType<typeof getPortfolioItem>>;
  try {
    item = await getPortfolioItem(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/portfolio">{t('nav.portfolio')}</Link> / {item.name}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
        <StatusBadge status={item.status} />
        <span className="text-sm text-fg-muted">{enumLabel(item.type)}</span>
      </div>
      {item.description && <p className="text-sm text-fg-muted">{item.description}</p>}

      <div className="flex flex-col gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-fg-muted">{t('common.statusLabel')}</span>
          <PortfolioStatusControl id={item.id} current={item.status} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-fg-muted">{t('portfolio.visibilityLabel')}</span>
          <PortfolioVisibilityControl id={item.id} current={item.visibility} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-fg-muted">{t('portfolio.externalRefLabel')}</span>
          <ExternalSourceLink url={item.externalUrl} />
        </div>
        <div className="text-fg-muted">
          Proyecto: {item.projectId ? <code>{item.projectId.slice(0, 8)}…</code> : '—'} · Activo:{' '}
          {item.assetId ? <code>{item.assetId.slice(0, 8)}…</code> : '—'}
        </div>
      </div>
    </div>
  );
}
