import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getDecision } from '@ct/application';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { DescriptionList } from '@/components/ui/description-list';
import { InlineEditSection } from '@/components/ui/inline-edit';
import { DecisionStatusControl } from '@/components/knowledge/forms';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

export default async function DecisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let decision: Awaited<ReturnType<typeof getDecision>>;
  try {
    decision = await getDecision(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/knowledge">{t('nav.knowledge')}</Link> /{' '}
        <Link className="hover:underline" href="/knowledge/decisions">{t('decisions.title')}</Link> / {decision.title}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{decision.title}</h1>
        <StatusBadge status={decision.status} />
      </div>

      {/* Ficha editable: el "por qué" (context) + qué se decidió + rationale */}
      <InlineEditSection
        title={t('entity.decision')}
        endpoint={`/api/v1/decisions/${decision.id}`}
        fields={[
          { name: 'title', label: t('field.title'), type: 'text', value: decision.title },
          { name: 'context', label: t('knowledge.contextoPorQueSurgio'), type: 'textarea', value: decision.context },
          { name: 'decision', label: t('knowledge.queSeDecidio'), type: 'textarea', value: decision.decision },
          { name: 'rationale', label: t('knowledge.razonPorQueEstaOpcion'), type: 'textarea', value: decision.rationale },
        ]}
      />

      {/* Estado + metadatos (no editables inline) */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-fg-muted">{t('knowledge.estado')}</span>
          <DecisionStatusControl id={decision.id} current={decision.status} />
        </div>
        <DescriptionList
          items={[
            { label: t('knowledge.decidida'), value: decision.decidedAt ? formatDateTime(decision.decidedAt) : null },
            { label: t('entity.project'), value: decision.projectId ? <code>{decision.projectId.slice(0, 8)}…</code> : null },
            { label: t('entity.service'), value: decision.serviceId ? <code>{decision.serviceId.slice(0, 8)}…</code> : null },
            { label: t('crm.fuenteDeVerdad'), value: t('knowledge.controlTowerDecisionNativa') },
            { label: t('crm.creada'), value: formatDateTime(decision.createdAt) },
          ]}
        />
      </section>
    </div>
  );
}
