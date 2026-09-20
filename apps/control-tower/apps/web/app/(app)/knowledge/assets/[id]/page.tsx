import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@ct/db';
import { getAsset, getIdentityForInternal } from '@ct/application';
import { ownedFields, PROVIDER_LABEL } from '@ct/domain';
import { isAppError } from '@ct/shared';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { DescriptionList } from '@/components/ui/description-list';
import { SourceBadge } from '@/components/ui/source-badge';
import { InlineEditSection } from '@/components/ui/inline-edit';
import { ExternalSourceLink } from '@/components/ui/external-source-link';
import { AssetStatusControl } from '@/components/knowledge/forms';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;

  let asset: Awaited<ReturnType<typeof getAsset>>;
  try {
    asset = await getAsset(getDb(), ctx.org, id);
  } catch (e) {
    if (isAppError(e) && e.kind === 'NOT_FOUND') notFound();
    throw e;
  }
  const identity = await getIdentityForInternal(getDb(), ctx.org, 'asset', id);
  const provider = identity?.provider ?? null;
  const owned = new Set(ownedFields('asset', provider));
  const hint = provider ? `Lo gestiona ${PROVIDER_LABEL[provider] ?? provider}; se edita en el origen.` : undefined;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/knowledge">{t('nav.knowledge')}</Link> /{' '}
        <Link className="hover:underline" href="/knowledge/assets">{t('assets.title')}</Link> / {asset.name}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{asset.name}</h1>
        <StatusBadge status={asset.status} />
        <span className="text-sm text-fg-muted">{asset.assetType}</span>
      </div>

      <InlineEditSection
        title={t('knowledge.asset')}
        endpoint={`/api/v1/assets/${asset.id}`}
        fields={[
          { name: 'name', label: t('field.name'), type: 'text', value: asset.name, readOnly: owned.has('name'), readOnlyHint: hint },
          { name: 'assetType', label: t('field.kind'), type: 'text', value: asset.assetType },
          { name: 'description', label: t('field.description'), type: 'textarea', value: asset.description, readOnly: owned.has('description'), readOnlyHint: hint },
          { name: 'version', label: t('field.version'), type: 'text', value: asset.version },
          { name: 'externalUrl', label: t('field.externalUrl'), type: 'text', value: asset.externalUrl, readOnly: owned.has('externalUrl'), readOnlyHint: hint },
          { name: 'repositoryUrl', label: t('field.repositoryUrl'), type: 'text', value: asset.repositoryUrl, readOnly: owned.has('repositoryUrl'), readOnlyHint: hint },
        ]}
      />

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-fg-muted">{t('knowledge.estado')}</span>
          <AssetStatusControl id={asset.id} current={asset.status} />
        </div>
        <DescriptionList
          items={[
            { label: t('crm.fuenteDeVerdad'), value: <SourceBadge source={provider ?? 'NATIVE'} url={identity?.metadata && (identity.metadata as { url?: string }).url ? (identity.metadata as { url?: string }).url : asset.externalUrl} linkLabel={t('knowledge.abrirExterno')} /> },
            { label: t('field.repositoryUrl'), value: <ExternalSourceLink url={asset.repositoryUrl} label={t('knowledge.verRepo')} /> },
            { label: t('crm.creado'), value: formatDateTime(asset.createdAt) },
          ]}
        />
      </section>
    </div>
  );
}
