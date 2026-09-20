import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getKnowledgeItem, getIdentityForInternal } from '@ct/application';
import { KNOWLEDGE_TYPE } from '@ct/domain';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { DescriptionList } from '@/components/ui/description-list';
import { InlineEditSection } from '@/components/ui/inline-edit';
import { SourceBadge } from '@/components/ui/source-badge';
import { ExternalSourceLink } from '@/components/ui/external-source-link';
import { singleExternalUrl } from '@/lib/external-url';
import { KnowledgeItemStatusControl } from '@/components/knowledge/forms';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

export default async function KnowledgeItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let item: Awaited<ReturnType<typeof getKnowledgeItem>>;
  try {
    item = await getKnowledgeItem(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }
  const identity = await getIdentityForInternal(getDb(), ctx.org, 'knowledge_item', id);
  const externalUrl = (identity?.metadata as { url?: string } | null)?.url ?? null;
  // «URLs relacionadas» es texto libre y admite varias a propósito: sólo se ofrece como enlace si hay UNA.
  const relatedUrl = singleExternalUrl(item.sourceUrl);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/knowledge">{t('nav.knowledge')}</Link> /{' '}
        <Link className="hover:underline" href="/knowledge/library">{t('knowledge.biblioteca')}</Link> / {item.title}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
        <StatusBadge status={item.status} />
        <span className="text-sm text-fg-muted">{enumLabel(item.knowledgeType)}</span>
      </div>

      <InlineEditSection
        title={t('knowledge.contenido')}
        endpoint={`/api/v1/knowledge-items/${item.id}`}
        fields={[
          { name: 'title', label: t('field.title'), type: 'text', value: item.title },
          { name: 'knowledgeType', label: t('field.kind'), type: 'select', options: KNOWLEDGE_TYPE, value: item.knowledgeType },
          { name: 'sector', label: t('field.sector'), type: 'text', value: item.sector },
          { name: 'summary', label: t('common.summary'), type: 'textarea', value: item.summary },
          { name: 'sourceUrl', label: t('field.sourceUrl'), type: 'textarea', value: item.sourceUrl },
        ]}
      />

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-fg-muted">{t('knowledge.estado')}</span>
          <KnowledgeItemStatusControl id={item.id} current={item.status} />
        </div>
        <DescriptionList
          items={[
            // Fuente = procedencia; los enlaces van en sus propias filas, cada uno diciendo a dónde lleva.
            { label: t('crm.fuenteDeVerdad'), value: <SourceBadge source={item.sourceType} /> },
            {
              label: t('field.sourceUrl'),
              value: relatedUrl ? (
                <ExternalSourceLink url={relatedUrl} label={t('knowledge.abrirFuente')} />
              ) : item.sourceUrl ? (
                <span className="whitespace-pre-wrap break-all text-fg-muted">{item.sourceUrl}</span>
              ) : null,
            },
            {
              label: t('entity.notionPage'),
              value: externalUrl ? <ExternalSourceLink url={externalUrl} label={t('knowledge.abrirEnNotion')} /> : null,
            },
            { label: t('knowledge.capturado'), value: formatDateTime(item.capturedAt) },
            { label: t('knowledge.revisado'), value: item.reviewedAt ? formatDateTime(item.reviewedAt) : null },
            { label: t('knowledge.approvedAt'), value: item.approvedAt ? formatDateTime(item.approvedAt) : null },
          ]}
        />
      </section>
    </div>
  );
}
