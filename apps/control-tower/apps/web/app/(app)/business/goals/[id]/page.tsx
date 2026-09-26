import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getGoal, listStrategicAreas } from '@ct/application';
import { LIFECYCLE_STATUS, PRIORITY } from '@ct/domain';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { DescriptionList } from '@/components/ui/description-list';
import { InlineEditSection } from '@/components/ui/inline-edit';
import { t } from '@/lib/i18n';
import { formatDate, formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let goal: Awaited<ReturnType<typeof getGoal>>;
  try {
    goal = await getGoal(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }
  const areas = await listStrategicAreas(getDb(), ctx.org);
  const area = goal.strategicAreaId ? areas.find((a) => a.id === goal.strategicAreaId) : null;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/business">{t('nav.business')}</Link> /{' '}
        <Link className="hover:underline" href="/business/goals">{t('business.goalsTitle')}</Link> / {goal.name}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{goal.name}</h1>
        <StatusBadge status={goal.status} />
      </div>

      <InlineEditSection
        title={t('entity.goal')}
        endpoint={`/api/v1/goals/${goal.id}`}
        fields={[
          { name: 'name', label: t('field.name'), type: 'text', value: goal.name },
          { name: 'description', label: t('field.description'), type: 'textarea', value: goal.description },
          { name: 'status', label: t('field.status'), type: 'select', options: LIFECYCLE_STATUS, value: goal.status },
          { name: 'priority', label: t('field.priority'), type: 'select', options: PRIORITY, value: goal.priority },
          {
            name: 'strategicAreaId',
            label: t('entity.strategic_area'),
            type: 'select',
            options: areas.map((a) => ({ value: a.id, label: a.name })),
            value: goal.strategicAreaId,
            display: area?.name ?? null,
          },
          {
            name: 'targetDate',
            label: t('field.targetDateGoal'),
            type: 'date',
            value: goal.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : null,
            display: goal.targetDate ? formatDate(goal.targetDate) : null,
          },
        ]}
      />

      <section className="flex flex-col gap-2">
        <DescriptionList
          items={[
            {
              label: t('business.viewArea'),
              value: goal.strategicAreaId ? (
                <Link className="underline underline-offset-2" href={`/business/strategic-areas/${goal.strategicAreaId}`}>
                  {area?.name ?? goal.strategicAreaId.slice(0, 8) + '…'}
                </Link>
              ) : null,
            },
            { label: t('meta.sourceOfTruth'), value: t('business.goalNativeSource') },
            { label: t('meta.createdAt'), value: formatDateTime(goal.createdAt) },
          ]}
        />
      </section>
    </div>
  );
}
