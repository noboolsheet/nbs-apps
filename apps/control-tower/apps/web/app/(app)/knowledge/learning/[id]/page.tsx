import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getLearningItem } from '@ct/application';
import { LEARNING_STATUS } from '@ct/domain';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { DescriptionList } from '@/components/ui/description-list';
import { InlineEditSection } from '@/components/ui/inline-edit';
import { ExternalSourceLink } from '@/components/ui/external-source-link';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

export default async function LearningDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let item: Awaited<ReturnType<typeof getLearningItem>>;
  try {
    item = await getLearningItem(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/knowledge/learning">{t('knowledge.learningPathTitle')}</Link> / {item.title}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
        <StatusBadge status={item.status} />
        <span className="rounded bg-neutral-soft px-2 py-0.5 text-xs">{item.kind}</span>
        {item.progress != null && <span className="text-xs text-fg-muted">{item.progress}%</span>}
      </div>

      <InlineEditSection
        title={t('knowledge.itemBadge')}
        endpoint={`/api/v1/learning/${item.id}`}
        fields={[
          { name: 'title', label: t('field.title'), type: 'text', value: item.title },
          { name: 'kind', label: t('field.kind'), type: 'text', value: item.kind },
          { name: 'status', label: t('field.status'), type: 'select', options: LEARNING_STATUS, value: item.status },
          { name: 'sector', label: t('field.sector'), type: 'text', value: item.sector },
          { name: 'progress', label: t('field.progress'), type: 'number', value: item.progress },
          { name: 'url', label: t('knowledge.resourceLinkLabel'), type: 'text', value: item.url },
          { name: 'notes', label: t('field.notes'), type: 'textarea', value: item.notes },
        ]}
      />

      <section className="flex flex-col gap-2">
        <ExternalSourceLink url={item.url} label={t('knowledge.openResource')} />
        <DescriptionList
          items={[
            { label: t('meta.sourceOfTruth'), value: t('knowledge.learningNativeSource') },
            { label: t('meta.createdAt'), value: formatDateTime(item.createdAt) },
          ]}
        />
      </section>
    </div>
  );
}
