'use client';

import { useState } from 'react';
import { QUICK_NOTE_DESTINATIONS, type QuickNoteDestination } from '@ct/domain';
import { postJson, patchJson, deleteJson } from '@/lib/client';
import { fieldCls } from '@/components/ui/input';
import { btnPrimary, btnLink, btnLinkDanger } from '@/components/ui/button';
import { useFormAction } from '@/lib/use-form-action';
import { t } from '@/lib/i18n';

export interface QuickNoteRow {
  id: string;
  body: string;
}

/**
 * **Bloc de notas rápidas** del Inicio (M44, owner 2026-09-27): escribes la idea sin decidir nada, y cuando sepas qué
 * es, le das un **destino** (tarea, decisión, conocimiento o «por revisar») o la **descartas**. Al hacerlo la nota se
 * va del bloc: la idea vive en un solo sitio.
 *
 * Es el único bloque de Inicio que **escribe**: el resto de la vista es una proyección de solo lectura. Por eso vive
 * en un componente de cliente y refresca el servidor con `useFormAction` como el resto de los formularios.
 */
export function QuickNotes({ notes }: { notes: QuickNoteRow[] }) {
  const [draft, setDraft] = useState('');
  const { error, busy, run } = useFormAction();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('home.notesTitle')}</h2>
      <form
        className="flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (draft.trim().length === 0) return;
          const ok = await run(() => postJson('/api/v1/quick-notes', { body: draft }));
          if (ok) setDraft('');
        }}
      >
        <textarea
          className={`${fieldCls} min-h-16`}
          placeholder={t('home.notesPlaceholder')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          // ⌘/Ctrl+Enter guarda sin soltar el teclado: es un bloc, se usa escribiendo.
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
          }}
        />
        <div className="flex items-center gap-3">
          <button type="submit" className={btnPrimary} disabled={busy || draft.trim().length === 0}>
            {t('home.notesAdd')}
          </button>
          <span className="text-xs text-fg-subtle">{t('home.notesHint')}</span>
        </div>
        {error && <span className="text-xs text-danger">{error}</span>}
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('home.notesEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((n) => (
            <QuickNote key={n.id} note={n} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Una nota del bloc: su texto (editable al pulsar) y las dos salidas — destino o descarte. */
function QuickNote({ note }: { note: QuickNoteRow }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const { error, busy, run } = useFormAction();

  async function file(destination: QuickNoteDestination) {
    await run(() => postJson(`/api/v1/quick-notes/${note.id}/file`, { destination }));
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-line px-3 py-2 text-sm">
      {editing ? (
        <textarea
          className={`${fieldCls} min-h-16`}
          value={body}
          autoFocus
          onChange={(e) => setBody(e.target.value)}
          onBlur={async () => {
            setEditing(false);
            if (body.trim().length > 0 && body !== note.body) {
              await run(() => patchJson(`/api/v1/quick-notes/${note.id}`, { body }));
            } else {
              setBody(note.body);
            }
          }}
        />
      ) : (
        <button type="button" className="whitespace-pre-wrap text-left" onClick={() => setEditing(true)}>
          {note.body}
        </button>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs text-fg-subtle">{t('home.notesFileAs')}</span>
        {QUICK_NOTE_DESTINATIONS.map((dest) => (
          <button key={dest} type="button" className={btnLink} disabled={busy} onClick={() => void file(dest)}>
            {t(`entity.${dest}`)}
          </button>
        ))}
        <button
          type="button"
          className={btnLinkDanger}
          disabled={busy}
          onClick={async () => {
            if (!confirm(t('home.notesConfirmDiscard'))) return;
            await run(() => deleteJson(`/api/v1/quick-notes/${note.id}`));
          }}
        >
          {t('home.notesDiscard')}
        </button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </li>
  );
}
