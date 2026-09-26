'use client';

import { useState } from 'react';
import { PROJECT_STATUS, TASK_STATUS, DELIVERABLE_STATUS } from '@ct/domain';
import { patchJson, deleteJson } from '@/lib/client';
import { StatusSelect } from '@/components/ui/status-select';
import { fieldCls } from '@/components/ui/input';
import { useFormAction } from '@/lib/use-form-action';
import { btnLinkDanger, btnSecondary } from '@/components/ui/button';
import { t } from '@/lib/i18n';

const inputCls = fieldCls;

export function ProjectStatusControl({ id, current }: { id: string; current: string }) {
  return <StatusSelect endpoint={`/api/v1/projects/${id}/status`} field="status" current={current} options={PROJECT_STATUS} />;
}

export function TaskStatusControl({ id, current }: { id: string; current: string }) {
  return <StatusSelect endpoint={`/api/v1/tasks/${id}/status`} field="status" current={current} options={TASK_STATUS} />;
}

/**
 * Acciones de fecha para el panel lateral de una tarea/subtarea: "Reprogramar" (input date) + "Pasar a hoy".
 * `today` se calcula en el navegador (para un owner self-hosted coincide con su zona horaria).
 */
export function TaskPanelActions({ id, dueDate }: { id: string; dueDate: string | null }) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{t('common.date')}</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-fg-muted">{t('tasks.rescheduleLabel')}</span>
        <TaskDueDateControl id={id} current={dueDate} />
        <TaskDueTodayButton id={id} today={today} />
      </div>
    </div>
  );
}

/**
 * Botón "Pasar a hoy": reprograma la fecha de una tarea a HOY (en el timezone de la org, que llega como prop
 * desde el servidor). Reutiliza el mismo PATCH que TaskDueDateControl. Útil para vencidas en el Home.
 */
export function TaskDueTodayButton({ id, today }: { id: string; today: string }) {
  const { error, busy, run } = useFormAction();
  return (
    <span className="inline-flex items-center gap-1">
      <button
        className={btnSecondary}
        disabled={busy}
        onClick={() => void run(() => patchJson(`/api/v1/tasks/${id}`, { dueDate: today }))}
        title={t('tasks.rescheduleToday')}
      >
        {t('tasks.moveToToday')}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}

/**
 * Botón "Completar": marca la tarea como completada (estado DONE), sea cual sea su estado actual.
 * Usa el endpoint de estado (`/status`) como el resto de cambios de estado. Útil para vencidas en el Home.
 */
export function TaskCompleteButton({ id }: { id: string }) {
  const { error, busy, run } = useFormAction();
  return (
    <span className="inline-flex items-center gap-1">
      <button
        className={btnSecondary}
        disabled={busy}
        onClick={() => void run(() => patchJson(`/api/v1/tasks/${id}/status`, { status: 'DONE' }))}
        title={t('tasks.markCompleted')}
      >
        ✓ Completar
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}

/**
 * Reprogramación rápida de la fecha de una tarea (Fase 4): un input date que hace PATCH al cambiar.
 * Útil sobre todo para tareas vencidas ("dale una fecha nueva").
 */
export function TaskDueDateControl({ id, current }: { id: string; current: string | null }) {
  const { error, busy, run } = useFormAction();
  const [value, setValue] = useState(current ?? '');
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="date"
        className={inputCls}
        value={value}
        disabled={busy}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          void run(() => patchJson(`/api/v1/tasks/${id}`, { dueDate: next || null }));
        }}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}

export function DeliverableStatusControl({ id, current }: { id: string; current: string }) {
  return <StatusSelect endpoint={`/api/v1/deliverables/${id}/status`} field="status" current={current} options={DELIVERABLE_STATUS} />;
}

/**
 * Acciones de una fase dentro de la ficha del proyecto: sólo **borrar**.
 *
 * Antes había también «Marcar actual» / «Quitar», que escribían `projects.current_phase_id`. Se retiró (owner,
 * 2026-09-27): la fase o fases en curso son las que están en estado **Activa**, así que marcar una aparte era un
 * segundo sitio donde decir lo mismo — y podían contradecirse (la «actual» completada, o una activa que no era la
 * actual). El estado de la fase es ahora la única fuente.
 */
export function PhaseActions({ phaseId, frozen }: { phaseId: string; frozen?: boolean }) {
  const { error, busy, run } = useFormAction();
  if (frozen) return <span className="text-xs text-fg-subtle">—</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={btnLinkDanger}
        disabled={busy}
        onClick={() => {
          if (confirm(t('projects.confirmDeletePhase'))) void run(() => deleteJson(`/api/v1/project-phases/${phaseId}`));
        }}
      >
        {t('common.delete')}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
