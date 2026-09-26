import Link from 'next/link';
import { getDb } from '@ct/db';
import { getBusinessOverview } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const CARDS = [
  { key: 'strategicAreas', label: t('business.areasTitle'), href: '/business/strategic-areas' },
  { key: 'goals', label: t('business.goalsTitle'), href: '/business/goals' },
  { key: 'capabilities', label: t('business.capabilitiesTitle'), href: '/business/capabilities' },
  { key: 'services', label: t('business.servicesTitle'), href: '/business/services' },
  // Procesos (SOP): no son entidad propia, son `knowledge_item` de tipo PROCESS (owner 2026-09-02).
  { key: 'processes', label: t('business.processesTitle'), href: '/business/processes' },
] as const;

export default async function BusinessOverviewPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const overview = await getBusinessOverview(getDb(), ctx.org);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.business')}</h1>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {CARDS.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className="rounded-lg border border-line p-4 hover:bg-surface-muted/40"
          >
            <div className="text-2xl font-semibold">{overview[c.key]}</div>
            <div className="text-sm text-fg-muted">{c.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
