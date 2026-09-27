import Link from 'next/link';
import { getDb } from '@ct/db';
import { getHomeDashboard } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { MetricCard } from '@/components/ui/metric-card';
import { QuickNotes } from '@/components/home/quick-notes';
import { StatusBadge } from '@/components/ui/status-badge';
import { HealthBadge } from '@/components/ui/health-badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { RecordLink } from '@/components/ui/record-link';
import { auditEntityTarget } from '@/lib/record-registry';
import { TaskCompleteButton, TaskDueDateControl } from '@/components/projects/forms';
import { enumLabel } from '@/lib/labels';
import { t, tPlural } from '@/lib/i18n';
import { formatDate, formatDateTime, formatMoney } from '@/lib/i18n/format';

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

      {/* DINERO — lo primero, porque es lo que no estaba en ninguna parte: cuánto te deben y cuánto debes. */}
      <MoneyStrip pending={d.money.pending} overdue={d.money.overdue} />

      {/* Las tres cifras que NO tienen su lista en esta página (carga, embudo y bandeja). Se fueron «Clientes» y
          «Decisiones» —no pedían ninguna acción— y «Proyectos activos», que repetía la lista de abajo. */}
      <section className="grid grid-cols-3 gap-3">
        <MetricCard label={t('home.metricOpenTasks')} value={d.snapshot.tasksOpen} href="/tasks" />
        <MetricCard label={t('home.metricOpenOpportunities')} value={d.snapshot.opportunitiesOpen} href="/crm/opportunities" />
        <MetricCard label={t('home.metricInboxPending')} value={d.snapshot.inboxPending} href="/knowledge/inbox" />
      </section>

      {/* Bloc de notas rápidas: el único bloque de Inicio que ESCRIBE. Va arriba porque se usa en el momento en que
          se te ocurre algo, no cuando bajas a leer la actividad reciente. */}
      <QuickNotes notes={d.quickNotes} />

      {/* DOS columnas continuas (no una rejilla por fila): así cada columna fluye con el alto de su contenido y no
          quedan huecos cuando una lista es más larga que la de al lado.
          Izquierda: atención → proyectos → decisiones → estado del sistema → actividad reciente.
          Derecha (sólo trabajo): vencidas → hoy → próximos 7 días → eventos del día. */}
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

          {/* Decisiones EN REVISIÓN (antes eran «las últimas», que era lectura y no pedía nada). */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('home.decisionsInReview')}</h2>
            {d.decisionsInReview.length === 0 ? (
              <EmptyState title={t('home.decisionsInReviewEmpty')} hint={t('home.decisionsInReviewHint')} />
            ) : (
              <ul className="flex flex-col gap-2">
                {d.decisionsInReview.map((dec) => (
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

          {/* Estado del sistema en UNA línea: es una señal de salud, no un panel. Deja de ocupar cuatro cajas y sigue
              llevando a donde se mira/arregla cada cosa. Si algo va mal, el punto se pone en rojo y el texto lo dice. */}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('home.systemHealth')}</h2>
            <Link
              href="/automation/health"
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm hover:bg-surface-muted ${
                d.systemHealth.db ? 'border-line' : 'border-danger-border'
              }`}
            >
              <span className={d.systemHealth.db ? 'text-success' : 'text-danger'} aria-hidden>
                ●
              </span>
              <span className="font-medium">{d.systemHealth.db ? t('home.healthOk') : t('home.healthDbDown')}</span>
              {d.systemHealth.dbLatencyMs != null && (
                <span className="text-xs text-fg-muted">{d.systemHealth.dbLatencyMs}ms</span>
              )}
              <span className="text-xs text-fg-muted">
                {t('home.jobsPending')}: {d.systemHealth.jobsPending} · {t('home.outboxPending')}:{' '}
                {d.systemHealth.outboxPending} · {t('home.integrations')}: {d.systemHealth.integrations}
              </span>
            </Link>
          </section>

          {/* Actividad reciente, debajo del estado del sistema (owner 2026-09-27): las dos son «qué ha pasado», no «qué
              tengo que hacer», así que van juntas al final de esta columna y la derecha se queda sólo con el trabajo. */}
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

          {/* Próximos 7 días: «lo que viene». Sin esto, Inicio sólo enseñaba vencidas y HOY, así que una tarea para
              mañana no existía desde aquí. Y al final, cuántas hay SIN fecha, que era el otro agujero. */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('home.upcoming')}</h2>
            {d.upcoming.length === 0 ? (
              <EmptyState title={t('home.upcomingEmpty')} />
            ) : (
              <ul className="flex flex-col gap-2">
                {d.upcoming.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <Link className="hover:underline" href={`/tasks/${task.id}`}>{task.title}</Link>
                      <TaskProject task={task} />
                    </span>
                    <span className="shrink-0 text-xs text-fg-muted">{formatDate(task.dueDate)}</span>
                  </li>
                ))}
              </ul>
            )}
            {d.tasksNoDue > 0 && (
              <Link className="text-xs text-fg-muted underline-offset-2 hover:underline" href="/tasks">
                {tPlural('home.tasksNoDue', d.tasksNoDue)}
              </Link>
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

/** Una fila de totales de dinero (los devuelve `getHomeDashboard` ya agrupados por dirección y moneda). */
interface MoneyTotal {
  direction: string;
  currencyCode: string;
  total: number;
  count: number;
}

/**
 * **Dinero** (owner 2026-09-27: «cuánto dinero debo o me deben»). Una línea por moneda: lo que te deben (cobros
 * pendientes, IN), lo que debes (gastos pendientes, OUT) y el **neto**. Si hay algo fuera de plazo, se dice aparte y
 * en rojo con su importe — antes esto sólo existía como aviso con el número de pagos, y «2 pagos retrasados» no dice
 * si son 40 € o 4.000 €.
 *
 * NO se suman monedas distintas: cada una va en su fila. Sumar euros con dólares no significaría nada.
 */
function MoneyStrip({ pending, overdue }: { pending: MoneyTotal[]; overdue: MoneyTotal[] }) {
  const currencies = [...new Set([...pending, ...overdue].map((r) => r.currencyCode))].sort();
  const pick = (rows: MoneyTotal[], currency: string, direction: string) =>
    rows.find((r) => r.currencyCode === currency && r.direction === direction);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('home.moneyTitle')}</h2>
      {currencies.length === 0 ? (
        <Link href="/payments" className="rounded-lg border border-line px-3 py-2 text-sm text-fg-muted hover:bg-surface-muted">
          {t('home.moneyEmpty')}
        </Link>
      ) : (
        <div className="flex flex-col gap-2">
          {currencies.map((currency) => {
            const inn = pick(pending, currency, 'IN');
            const out = pick(pending, currency, 'OUT');
            const lateIn = pick(overdue, currency, 'IN');
            const lateOut = pick(overdue, currency, 'OUT');
            const net = (inn?.total ?? 0) - (out?.total ?? 0);
            return (
              <div key={currency} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-lg border border-line px-3 py-2 text-sm">
                <Link className="hover:underline" href="/payments">
                  <span className="text-fg-muted">{t('home.moneyOwedToYou')}: </span>
                  <span className="font-medium tabular-nums">{formatMoney(inn?.total ?? 0, currency)}</span>
                  {!!inn?.count && <span className="text-xs text-fg-subtle"> ({inn.count})</span>}
                </Link>
                <Link className="hover:underline" href="/payments">
                  <span className="text-fg-muted">{t('home.moneyYouOwe')}: </span>
                  <span className="font-medium tabular-nums">{formatMoney(out?.total ?? 0, currency)}</span>
                  {!!out?.count && <span className="text-xs text-fg-subtle"> ({out.count})</span>}
                </Link>
                <span>
                  <span className="text-fg-muted">{t('home.moneyNet')}: </span>
                  <span className={`font-medium tabular-nums ${net < 0 ? 'text-danger' : ''}`}>
                    {net > 0 ? '+' : ''}
                    {formatMoney(net, currency)}
                  </span>
                </span>
                {(lateIn || lateOut) && (
                  <Link className="text-danger hover:underline" href="/payments?ver=retrasados">
                    ⚠ {t('home.moneyOverdue')}:{' '}
                    <span className="font-medium tabular-nums">
                      {formatMoney((lateIn?.total ?? 0) + (lateOut?.total ?? 0), currency)}
                    </span>
                    <span className="text-xs"> ({(lateIn?.count ?? 0) + (lateOut?.count ?? 0)})</span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
