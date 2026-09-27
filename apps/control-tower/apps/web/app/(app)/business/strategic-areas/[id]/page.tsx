import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getStrategicArea, listGoalsByArea } from '@ct/application';
import { LIFECYCLE_STATUS } from '@ct/domain';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { DescriptionList } from '@/components/ui/description-list';
import { InlineEditSection } from '@/components/ui/inline-edit';
import { ContextNewButton } from '@/components/ui/context-new-button';
import { RecordLink } from '@/components/ui/record-link';
import { RecordTable } from '@/components/ui/record-table';
import { type Column } from '@/components/ui/entity-table';
import { enumLabel } from '@/lib/labels';
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
  // E-12: los objetivos de un área se ordenan a mano (`sort_order`), así que se piden ya ordenados en vez de
  // filtrar la lista global (que va por fecha, porque ahí `sort_order` es una posición dentro de OTRA área).
  const areaGoals = await listGoalsByArea(getDb(), ctx.org, id);

  const goalCols: Column<(typeof areaGoals)[number]>[] = [
    {
      header: t('entity.goal'),
      value: (g) => g.name,
      cell: (g) => (
        <RecordLink entity="goal" id={g.id} className="underline underline-offset-2">{g.name}</RecordLink>
      ),
    },
    { header: t('field.status'), value: (g) => enumLabel(g.status), cell: (g) => <StatusBadge status={g.status} /> },
  ];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/business">{t('nav.business')}</Link> /{' '}
        <Link className="hover:underline" href="/business/strategic-areas">{t('business.areasTitle')}</Link> / {area.name}
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
            {t('business.goalsTitle')} ({areaGoals.length})
          </h2>
          <ContextNewButton entity="goal" ctxKey="strategic_area" parentId={area.id} label={t('business.newGoal')} />
        </div>
        {/* Pasó de `<ul>` a `RecordTable` con E-12: el orden de los objetivos de un área lo decide el owner, y
            así hereda de una vez el asa de reordenar, el filtro y el estado vacío del resto de listas. */}
        <RecordTable
          columns={goalCols}
          rows={areaGoals}
          getKey={(g) => g.id}
          empty={{ title: t('business.goalsLinkedEmpty') }}
          reorder={{ entityType: 'goal' }}
        />
      </section>

      <section className="flex flex-col gap-2">
        <DescriptionList
          items={[
            { label: t('meta.sourceOfTruth'), value: t('business.areaNativeSource') },
            { label: t('meta.createdAtFem'), value: formatDateTime(area.createdAt) },
          ]}
        />
      </section>
    </div>
  );
}
