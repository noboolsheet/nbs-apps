'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KNOWLEDGE_ITEM_STATUS, DECISION_STATUS, ASSET_STATUS, REVIEW_ITEM_STATUS } from '@ct/domain';
import { postJson, deleteJson } from '@/lib/client';
import { StatusSelect } from '@/components/ui/status-select';
import { fieldCls } from '@/components/ui/input';
import { btnPrimary, btnSecondary } from '@/components/ui/button';
import { t } from '@/lib/i18n';

const inputCls = fieldCls;
const submitBtn = btnPrimary;
const ghostBtn = btnSecondary;

function useSubmit() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<{ error?: { message: string } }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.error) setError(res.error.message);
    else router.refresh();
    return !res.error;
  }
  return { error, busy, run };
}


export function KnowledgeItemStatusControl({ id, current }: { id: string; current: string }) {
  return <StatusSelect endpoint={`/api/v1/knowledge-items/${id}/status`} current={current} options={KNOWLEDGE_ITEM_STATUS} />;
}
export function DecisionStatusControl({ id, current }: { id: string; current: string }) {
  return <StatusSelect endpoint={`/api/v1/decisions/${id}/status`} current={current} options={DECISION_STATUS} />;
}
export function ReviewItemStatusControl({ id, current }: { id: string; current: string }) {
  return <StatusSelect endpoint={`/api/v1/review-items/${id}/status`} current={current} options={REVIEW_ITEM_STATUS} />;
}
export function AssetStatusControl({ id, current }: { id: string; current: string }) {
  return <StatusSelect endpoint={`/api/v1/assets/${id}/status`} current={current} options={ASSET_STATUS} />;
}

export function CaptureForm() {
  const [rawContent, setRawContent] = useState('');
  const [sourceType, setSourceType] = useState('MANUAL');
  const { error, busy, run } = useSubmit();
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(() => postJson('/api/v1/knowledge-inbox', { rawContent, sourceType }));
        if (ok) setRawContent('');
      }}
    >
      <textarea className={`${inputCls} min-h-20`} placeholder={t('ui.capturaRapidaDeConocimiento')} value={rawContent} onChange={(e) => setRawContent(e.target.value)} required />
      <div className="flex items-center gap-2">
        <input className={inputCls} placeholder={t('ui.fuenteChatgptNota')} value={sourceType} onChange={(e) => setSourceType(e.target.value)} />
        <button className={submitBtn} disabled={busy}>{t('ui.capturar')}</button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </form>
  );
}

/**
 * Acciones al pie del panel lateral de una captura. Si NO está resuelta: **Procesar → biblioteca**
 * (promueve con los metadatos ya editados en el panel) y **Descartar**, directas. Siempre disponible:
 * **Eliminar** (borrado definitivo, con confirmación) — también en las procesadas/descartadas de solo lectura.
 */
export function InboxPanelActions({ id, resolved, onDone }: { id: string; resolved: boolean; onDone: () => void }) {
  const { error, busy, run } = useSubmit();
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-line pt-3">
      <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{t('ui.acciones')}</span>
      {!resolved && (
        <div className="flex gap-2">
          <button
            className={submitBtn}
            type="button"
            disabled={busy}
            onClick={async () => {
              const ok = await run(() => postJson(`/api/v1/knowledge-inbox/${id}/promote`, {}));
              if (ok) onDone();
            }}
          >
            {t('ui.procesarBiblioteca')}
          </button>
          <button
            className={ghostBtn}
            type="button"
            disabled={busy}
            onClick={async () => {
              const ok = await run(() => postJson(`/api/v1/knowledge-inbox/${id}/discard`, {}));
              if (ok) onDone();
            }}
          >
            {t('ui.descartar')}
          </button>
        </div>
      )}
      {!confirmDelete ? (
        <button className="self-start text-xs text-danger hover:underline" type="button" onClick={() => setConfirmDelete(true)}>
          {t('ui.eliminar')}
        </button>
      ) : (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-fg-muted">{t('knowledge.confirmDelete')}</span>
          <button
            className="font-medium text-danger hover:underline"
            type="button"
            disabled={busy}
            onClick={async () => {
              const ok = await run(() => deleteJson(`/api/v1/knowledge-inbox/${id}`));
              if (ok) onDone();
            }}
          >
            {t('ui.siEliminar')}
          </button>
          <button className="text-fg-muted hover:underline" type="button" onClick={() => setConfirmDelete(false)}>
            {t('common.cancel')}
          </button>
        </div>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

export function CreateDocumentForm({ projectId, clientId }: { projectId?: string; clientId?: string }) {
  const [name, setName] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const { error, busy, run } = useSubmit();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(() =>
          postJson('/api/v1/documents', { name, externalUrl: externalUrl || undefined, projectId, clientId }),
        );
        if (ok) {
          setName('');
          setExternalUrl('');
        }
      }}
    >
      <input className={inputCls} placeholder={t('ui.nombreDelDocumento')} value={name} onChange={(e) => setName(e.target.value)} required />
      <input className={inputCls} placeholder={t('ui.urlExternaDriveNotion')} value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
      <button className={submitBtn} disabled={busy}>{t('ui.referencia')}</button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </form>
  );
}

/**
 * Acción al pie del panel de un recurso de «Por revisar»: pasarlo a la **biblioteca**. Sólo aparece cuando está
 * marcado como revisado; si ya se pasó, se enseña el enlace al elemento creado en vez del botón.
 */
export function ReviewItemPanelActions({
  id,
  status,
  knowledgeItemId,
  onDone,
}: {
  id: string;
  status: string;
  knowledgeItemId: string | null;
  onDone: () => void;
}) {
  const { error, busy, run } = useSubmit();
  if (status !== 'REVIEWED' && !knowledgeItemId) return null;

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-line pt-3">
      <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{t('ui.acciones')}</span>
      {knowledgeItemId ? (
        <Link href={`/knowledge/library/${knowledgeItemId}`} className="text-sm text-link underline-offset-2 hover:underline">
          {t('review.alreadyInLibrary')}
        </Link>
      ) : (
        <>
          <button
            className={submitBtn}
            type="button"
            disabled={busy}
            onClick={async () => {
              const ok = await run(() => postJson(`/api/v1/review-items/${id}/promote`, {}));
              if (ok) onDone();
            }}
          >
            {t('review.promote')}
          </button>
          <p className="text-xs text-fg-subtle">{t('review.promoteHint')}</p>
        </>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
