'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PROJECT_STATUS, TASK_STATUS, DELIVERABLE_STATUS } from '@ct/domain';
import { patchJson, deleteJson } from '@/lib/client';
import { StatusSelect } from '@/components/ui/status-select';
import { fieldCls } from '@/components/ui/input';
import { t } from '@/lib/i18n';

const inputCls = fieldCls;

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
      <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{t('ui.fecha')}</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-fg-muted">{t('ui.reprogramar')}</span>
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
  const { error, busy, run } = useSubmit();
  return (
    <span className="inline-flex items-center gap-1">
      <button
        className="rounded border border-line-strong px-2 py-1.5 text-sm hover:bg-surface-muted disabled:opacity-50"
        disabled={busy}
        onClick={() => void run(() => patchJson(`/api/v1/tasks/${id}`, { dueDate: today }))}
        title={t('ui.reprogramarParaHoy')}
      >
        {t('ui.pasarAHoy')}
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
  const { error, busy, run } = useSubmit();
  return (
    <span className="inline-flex items-center gap-1">
      <button
        className="rounded border border-line-strong px-2 py-1.5 text-sm hover:bg-surface-muted disabled:opacity-50"
        disabled={busy}
        onClick={() => void run(() => patchJson(`/api/v1/tasks/${id}/status`, { status: 'DONE' }))}
        title={t('ui.marcarComoCompletada')}
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
  const { error, busy, run } = useSubmit();
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
 * Acciones de una FASE de proyecto en la lista de la ficha: marcar/quitar como fase actual del proyecto
 * (PATCH `/projects/[id]/current-phase`) y borrar (DELETE `/project-phases/[id]`). En proyecto cerrado (frozen)
 * queda de solo lectura (solo muestra "Actual" si lo es).
 */
export function PhaseActions({
  projectId,
  phaseId,
  isCurrent,
  frozen,
}: {
  projectId: string;
  phaseId: string;
  isCurrent: boolean;
  frozen?: boolean;
}) {
  const { error, busy, run } = useSubmit();
  const currentBadge = (
    <span className="inline-flex items-center rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success-soft-fg">
      {t('projects.phaseCurrent')}
    </span>
  );
  if (frozen) return isCurrent ? currentBadge : <span className="text-xs text-fg-subtle">—</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {isCurrent ? (
        <>
          {currentBadge}
          <button
            type="button"
            className="text-xs text-fg-muted underline disabled:opacity-50"
            disabled={busy}
            onClick={() => void run(() => patchJson(`/api/v1/projects/${projectId}/current-phase`, { phaseId: null }))}
          >
            {t('ui.quitar')}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="rounded border border-line-strong px-2 py-1 text-xs hover:bg-surface-muted disabled:opacity-50"
          disabled={busy}
          onClick={() => void run(() => patchJson(`/api/v1/projects/${projectId}/current-phase`, { phaseId }))}
        >
          {t('ui.marcarActual')}
        </button>
      )}
      <button
        type="button"
        className="text-xs text-danger underline disabled:opacity-50"
        disabled={busy}
        onClick={() => {
          if (confirm('¿Borrar esta fase? Es definitivo.')) void run(() => deleteJson(`/api/v1/project-phases/${phaseId}`));
        }}
      >
        {t('common.delete')}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
