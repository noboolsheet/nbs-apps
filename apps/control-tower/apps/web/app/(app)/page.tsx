import Link from 'next/link';
import { getDb } from '@ct/db';
import { getHomeDashboard } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { MetricCard } from '@/components/ui/metric-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { HealthBadge } from '@/components/ui/health-badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { RecordLink } from '@/components/ui/record-link';
import { auditEntityTarget } from '@/lib/record-registry';
import { TaskCompleteButton, TaskDueDateControl } from '@/components/projects/forms';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.home')}</h1>
        <p className="text-warning">{t('home.noOrg')}</p>
      </div>
    );
  }
  const d = await getHomeDashboard(getDb(), ctx.org);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.home')}</h1>
      </div>

      {/* Executive Snapshot */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MetricCard label={t('home.metricClients')} value={d.snapshot.clients} href="/crm/clients?status=ACTIVE" />
        <MetricCard label={t('home.activeProjects')} value={d.snapshot.projectsActive} href="/projects?tab=Active" />
        <MetricCard label={t('home.metricOpenOpportunities')} value={d.snapshot.opportunitiesOpen} href="/crm/opportunities" />
        <MetricCard label={t('home.metricOpenTasks')} value={d.snapshot.tasksOpen} href="/tasks" />
        <MetricCard label={t('decisions.title')} value={d.snapshot.decisions} href="/knowledge/decisions" />
      </section>

      {/* DOS columnas continuas (no una rejilla por fila): así cada columna fluye con el alto de su contenido y no
          quedan huecos cuando una lista es más larga que la de al lado.
          Izquierda: atención → proyectos → decisiones → estado del sistema. Derecha: vencidas → hoy → eventos → actividad. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* Columna izquierda */}
        <div className="flex flex-col gap-6">
          {/* Attention Required */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('home.attention')}</h2>
            {d.attention.length === 0 ? (
              <p className="text-sm text-fg-muted">{t('home.attentionEmpty')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {d.attention.map((a, i) => (
                  <li key={`${a.kind}-${i}`}>
                    <Link
                      href={a.href}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-surface-muted/40 ${
                        a.severity === 'high'
                          ? 'border-danger-border'
                          : 'border-warning-border'
                      }`}
                    >
                      <span aria-hidden>{a.severity === 'high' ? '■' : '◐'}</span>
                      {a.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Active Projects */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('home.activeProjects')}</h2>
            {d.activeProjects.length === 0 ? (
              <EmptyState title={t('home.activeProjectsEmpty')} hint={t('home.activeProjectsEmptyHint')} />
            ) : (
              <ul className="flex flex-col gap-2">
                {d.activeProjects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm">
                    <Link className="font-medium underline-offset-2 hover:underline" href={`/projects/${p.id}`}>{p.name}</Link>
                    <div className="flex items-center gap-2">
                      {p.health === 'AT_RISK' && <HealthBadge health={p.health} />}
                      <ProgressBar value={p.progress} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent Decisions */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('home.recentDecisions')}</h2>
            {d.recentDecisions.length === 0 ? (
              <EmptyState title={t('decisions.empty')} />
            ) : (
              <ul className="flex flex-col gap-2">
                {d.recentDecisions.map((dec) => (
                  <li key={dec.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm">
                    {/* `decision` es panel-only en el registro: su ficha ES el panel lateral, así que se entra con
                        `RecordLink` (abre el drawer sobre Home) en vez de navegar a una página que no existe. */}
                    <RecordLink entity="decision" id={dec.id} className="min-w-0 truncate hover:underline">
                      {dec.title}
                    </RecordLink>
                    <StatusBadge status={dec.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* System Health */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('home.systemHealth')}</h2>
            {/* Las cuatro cajas llevan a donde se mira/arregla cada cosa: eran texto muerto, y cuando la salida
                pendiente crece lo que quieres es llegar allí de un clic, no buscarlo en el menú. */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link href="/automation/health" className={healthBox}>
                DB {d.systemHealth.db ? <StatusBadge status="ACTIVE" /> : <StatusBadge status="ERROR" />}
                {d.systemHealth.dbLatencyMs != null && (
                  <span className="text-xs text-fg-muted"> · {d.systemHealth.dbLatencyMs}ms</span>
                )}
              </Link>
              <Link href="/automation/integrations" className={healthBox}>
                {t('home.integrations')}: {d.systemHealth.integrations}
              </Link>
              <Link href="/automation/health" className={healthBox}>
                {t('home.jobsPending')}: {d.systemHealth.jobsPending}
              </Link>
              <Link href="/automation/health" className={healthBox}>
                {t('home.outboxPending')}: {d.systemHealth.outboxPending}
              </Link>
            </div>
          </section>
        </div>

        {/* Columna derecha */}
        <div className="flex flex-col gap-6">
          {/* Overdue */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-danger">{t('home.overdue')}</h2>
            {d.overdue.length === 0 ? (
              <EmptyState title={t('home.overdueEmpty')} />
            ) : (
              <ul className="flex flex-col gap-2">
                {d.overdue.map((task) => (
                  <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger-border px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <Link className="hover:underline" href={`/tasks/${task.id}`}>{task.title}</Link>
                      <span className="ml-2 text-xs text-danger">{task.dueDate}</span>
                      <TaskProject task={task} />
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <TaskCompleteButton id={task.id} />
                      <TaskDueDateControl id={task.id} current={task.dueDate} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Today's Work */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('home.todaysWork')}</h2>
            {d.todaysWork.length === 0 ? (
              <EmptyState title={t('home.todaysWorkEmpty')} />
            ) : (
              <ul className="flex flex-col gap-2">
                {d.todaysWork.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <Link className="hover:underline" href={`/tasks/${task.id}`}>{task.title}</Link>
                      <TaskProject task={task} />
                    </span>
                    <span className="shrink-0 text-xs text-fg-muted">{task.dueDate}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Today's Events (Google Calendar) */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('home.todaysEvents')}</h2>
            {d.todaysEvents.length === 0 ? (
              <EmptyState title={t('home.todaysEventsEmpty')} />
            ) : (
              <ul className="flex flex-col gap-2">
                {d.todaysEvents.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      {e.href ? (
                        <a className="hover:underline" href={e.href} target="_blank" rel="noreferrer noopener">{e.title}</a>
                      ) : (
                        e.title
                      )}
                      {e.location && <span className="text-xs text-fg-subtle"> · {e.location}</span>}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-fg-muted">{e.time}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent Activity */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('home.recentActivity')}</h2>
            {d.recentActivity.length === 0 ? (
              <EmptyState title={t('home.recentActivityEmpty')} />
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {d.recentActivity.map((a, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 border-b border-line-subtle py-1">
                    <span className="min-w-0">
                      <span className="font-medium">{enumLabel(a.action)}</span> {enumLabel(a.entityType)}
                      {/* El nombre es lo que convierte «Actualizó proyecto» en información útil, y ahora además
                          se puede ABRIR (una nota lleva al registro del que habla; un DELETE no lleva a nada). */}
                      <ActivityTarget entry={a} />
                      {a.detail && <span className="text-fg-muted">{` → ${enumLabel(a.detail)}`}</span>}
                    </span>
                    <span className="text-xs text-fg-subtle">
                      {enumLabel(a.actorType)} · {formatDateTime(a.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * Proyecto al que pertenece una tarea de Home, junto a su título. Sin esto, con varios proyectos activos las listas
 * de «Vencidas» y «Trabajo de hoy» no decían de cuál era cada tarea (petición del owner). Una tarea personal o de
 * preventa no tiene proyecto: ahí no se pinta nada, en vez de un «—» que no aporta.
 */
function TaskProject({ task }: { task: { projectId: string | null; projectName: string | null } }) {
  if (!task.projectId || !task.projectName) return null;
  return (
    <>
      {' '}
      <Link
        href={`/projects/${task.projectId}`}
        className="text-xs text-fg-muted underline-offset-2 hover:underline"
      >
        {task.projectName}
      </Link>
    </>
  );
}

/** Caja de «Estado del sistema»: ahora es un enlace, con el mismo aspecto que tenía como `div`. */
const healthBox = 'rounded border border-line px-3 py-2 hover:bg-surface-muted';

/**
 * Nombre del registro de una entrada de «Actividad reciente», **abrible** cuando se puede.
 *
 * `linkTo` lo decide la capa de aplicación (ya con el nombre resuelto): un DELETE no lleva a ningún sitio —el
 * registro ya no existe— y una NOTA lleva al registro del que habla, no a la nota, que no tiene ficha. Aquí sólo
 * se traduce a ruta: panel (`RecordLink`) para lo que está en el registro, página para lo que no (documentos), y
 * texto plano para lo que no se puede abrir (integración, organización, usuario…).
 */
function ActivityTarget({
  entry,
}: {
  entry: {
    entityName: string | null;
    linkTo: { entityType: string; entityId: string; label: string } | null;
  };
}) {
  const link = entry.linkTo;
  if (!link) return entry.entityName ? <span className="text-fg">{` «${entry.entityName}»`}</span> : null;
  const target = auditEntityTarget(link.entityType);
  if (!target) return <span className="text-fg">{` «${link.label}»`}</span>;
  const inner = `«${link.label}»`;
  return (
    <>
      {' '}
      {'rec' in target ? (
        <RecordLink entity={target.rec} id={link.entityId} className="text-fg underline-offset-2 hover:underline">
          {inner}
        </RecordLink>
      ) : (
        <Link href={target.href(link.entityId)} className="text-fg underline-offset-2 hover:underline">
          {inner}
        </Link>
      )}
    </>
  );
}
