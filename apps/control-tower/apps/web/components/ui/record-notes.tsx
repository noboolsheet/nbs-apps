'use client';

import { useCallback, useEffect, useState } from 'react';
import { deleteJson, getJson, patchJson, postJson } from '@/lib/client';
import { btnGhost, btnPrimary } from '@/components/ui/button';
import { fieldCls } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

type NoteRow = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorId: string | null;
  authorName: string | null;
  mine: boolean;
};

/**
 * E-15 — bloque «Notas» del panel lateral: texto libre sobre ESTE registro («hablado con el cliente, mueve la
 * entrega a marzo»). Distinto del «Historial», que dice qué campo cambió.
 *
 * A diferencia del historial, **se carga solo al abrir el panel y se muestra desplegado**: una nota que hay que
 * descubrir pulsando no cumple su función. Es una consulta por el índice `(entity_type, entity_id)`.
 *
 * `entity` es el nombre CANÓNICO del registro (el de auditoría: `learning_item`, no `learning`), que el panel
 * saca de `spec.auditEntity ?? spec.entity`.
 */
export function RecordNotes({ entity, id }: { entity: string; id: string }) {
  const [rows, setRows] = useState<NoteRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const load = useCallback(async () => {
    const res = await getJson<NoteRow[]>(`/api/v1/notes?entity=${encodeURIComponent(entity)}&id=${id}`);
    if (res.error) setError(res.error.message);
    else {
      setError(null);
      setRows(res.data ?? []);
    }
  }, [entity, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    const res = await postJson<NoteRow>('/api/v1/notes', { entityType: entity, entityId: id, body });
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setDraft(''); // sólo se limpia si guardó: si falla, el texto escrito no se pierde
    await load();
  }

  async function saveEdit(noteId: string) {
    const body = editDraft.trim();
    if (!body || busy) return;
    setBusy(true);
    const res = await patchJson<NoteRow>(`/api/v1/notes/${noteId}`, { body });
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setEditingId(null);
    await load();
  }

  async function remove(noteId: string) {
    if (!confirm(t('notes.confirmDelete'))) return;
    setBusy(true);
    const res = await deleteJson(`/api/v1/notes/${noteId}`);
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    await load();
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{t('notes.title')}</span>

      <div className="flex flex-col gap-1">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('notes.placeholder')}
          rows={2}
          className={`${fieldCls} w-full`}
        />
        <div className="flex justify-end">
          <button type="button" className={btnPrimary} disabled={busy || draft.trim() === ''} onClick={() => void add()}>
            {busy ? t('notes.adding') : t('notes.add')}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      {rows === null && !error && <p className="text-xs text-fg-muted">{t('common.loading')}</p>}
      {rows?.length === 0 && <p className="text-xs text-fg-muted">{t('notes.empty')}</p>}

      <div className="flex flex-col gap-2">
        {rows?.map((n) => (
          <div key={n.id} className="flex flex-col gap-1 rounded border border-line-subtle px-2 py-1.5 text-xs">
            <span className="text-fg-subtle">
              {n.mine ? t('history.you') : (n.authorName ?? t('notes.unknownAuthor'))} · {formatDateTime(n.createdAt)}
              {n.updatedAt !== n.createdAt && ` · ${t('notes.edited')}`}
            </span>
            {editingId === n.id ? (
              <div className="flex flex-col gap-1">
                <textarea
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  rows={3}
                  className={`${fieldCls} w-full`}
                />
                <div className="flex justify-end gap-1">
                  <button type="button" className={btnGhost} disabled={busy} onClick={() => setEditingId(null)}>
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={busy || editDraft.trim() === ''}
                    onClick={() => void saveEdit(n.id)}
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* `whitespace-pre-wrap`: los saltos de línea que escribe la persona se respetan. */}
                <p className="whitespace-pre-wrap text-fg">{n.body}</p>
                {n.mine && (
                  <div className="flex gap-2 text-fg-subtle">
                    <button
                      type="button"
                      className="underline-offset-2 hover:underline"
                      onClick={() => {
                        setEditingId(n.id);
                        setEditDraft(n.body);
                      }}
                    >
                      {t('notes.edit')}
                    </button>
                    <button
                      type="button"
                      className="text-danger underline-offset-2 hover:underline"
                      disabled={busy}
                      onClick={() => void remove(n.id)}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
