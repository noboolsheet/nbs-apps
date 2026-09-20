import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getStrategicArea, listGoals } from '@ct/application';
import { LIFECYCLE_STATUS } from '@ct/domain';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { DescriptionList } from '@/components/ui/description-list';
import { InlineEditSection } from '@/components/ui/inline-edit';
import { ContextNewButton } from '@/components/ui/context-new-button';
import { RecordLink } from '@/components/ui/record-link';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

export default async function StrategicAreaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let area: Awaited<ReturnType<typeof getStrategicArea>>;
  try {
    area = await getStrategicArea(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }
  const allGoals = await listGoals(getDb(), ctx.org);
  const areaGoals = allGoals.filter((g) => g.strategicAreaId === id);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/business">{t('nav.business')}</Link> /{' '}
        <Link className="hover:underline" href="/business/strategic-areas">{t('business.areasEstrategicas')}</Link> / {area.name}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{area.name}</h1>
        <StatusBadge status={area.status} />
      </div>

      <InlineEditSection
        title={t('entity.strategic_area')}
        endpoint={`/api/v1/strategic-areas/${area.id}`}
        fields={[
          { name: 'name', label: t('field.name'), type: 'text', value: area.name },
          { name: 'description', label: t('field.description'), type: 'textarea', value: area.description },
          { name: 'status', label: t('field.status'), type: 'select', options: LIFECYCLE_STATUS, value: area.status },
          { name: 'sortOrder', label: t('field.sortOrder'), type: 'number', value: area.sortOrder },
        ]}
      />

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">
            Objetivos ({areaGoals.length})
          </h2>
          <ContextNewButton entity="goal" ctxKey="strategic_area" parentId={area.id} label={t('business.nuevoObjetivo')} />
        </div>
        {areaGoals.length === 0 ? (
          <p className="text-sm text-fg-subtle">{t('business.ningunObjetivoVinculadoAEstaAreaTodavia')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line-subtle">
            {areaGoals.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <RecordLink entity="goal" id={g.id} className="underline underline-offset-2">{g.name}</RecordLink>
                <StatusBadge status={g.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <DescriptionList
          items={[
            { label: t('crm.fuenteDeVerdad'), value: t('business.controlTowerAreaNativa') },
            { label: t('crm.creada'), value: formatDateTime(area.createdAt) },
          ]}
        />
      </section>
    </div>
  );
}
