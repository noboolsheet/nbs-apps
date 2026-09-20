import { getDb } from '@ct/db';
import { listPayments, pendingPaymentTotals, getOrganization } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { type Column } from '@/components/ui/entity-table';
import { RecordTable } from '@/components/ui/record-table';
import { ListPage } from '@/components/ui/list-page';
import { Tabs } from '@/components/ui/tabs';
import { NewRecordButton } from '@/components/ui/new-record-button';
import { RecordLink } from '@/components/ui/record-link';
import { PaymentStatusControl } from '@/components/payments/forms';
import { enumLabel } from '@/lib/labels';
import { formatDate } from '@/lib/i18n/format';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

type Payment = Awaited<ReturnType<typeof listPayments>>[number];

/**
 * Porcentaje de lo pendiente de cobrar que conviene apartar para impuestos. Constante a propósito: es una regla de
 * bolsillo del owner, no un cálculo fiscal — si algún día depende del régimen o del país, pasará a Ajustes.
 */
const TAX_RESERVE_PCT = 30;

/** Importe con su moneda, alineado a la derecha para poder compararlos de un vistazo. */
function money(amount: string, currency: string): string {
  return `${Number(amount).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const view = (await searchParams).ver;
  const db = getDb();
  const [rows, totals, org] = await Promise.all([
    listPayments(db, ctx.org),
    pendingPaymentTotals(db, ctx.org),
    getOrganization(db, ctx.org),
  ]);
  // "Hoy" en la zona horaria de la organización, igual que en las tareas vencidas.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: org.settings.timezone || 'UTC' }).format(new Date());
  const pending = rows.filter((p) => p.status === 'PENDING');
  const paid = rows.filter((p) => p.status === 'PAID');
  const overdue = pending.filter((p) => p.dueDate != null && p.dueDate < today);

  const columns: Column<Payment>[] = [
    {
      header: t('field.concept'),
      value: (p) => p.concept,
      cell: (p) => (
        <RecordLink entity="payment" id={p.id} className="font-medium underline-offset-2 hover:underline">
          {p.concept}
        </RecordLink>
      ),
    },
    {
      header: t('field.direction'),
      className: 'w-40 whitespace-nowrap',
      value: (p) => enumLabel(p.direction),
      // Convención contable: el dinero que entra en verde y el que sale en rojo. El signo ↓/↑ acompaña al color
      // para que la dirección se lea también sin distinguirlos.
      cell: (p) => (
        <span className={p.direction === 'IN' ? 'text-success' : 'text-danger'}>
          {p.direction === 'IN' ? '↓ ' : '↑ '}
          {enumLabel(p.direction)}
        </span>
      ),
    },
    {
      header: t('payments.counterparty'),
      className: 'w-48',
      value: (p) => p.counterparty,
      cell: (p) => p.counterparty ?? <span className="text-fg-subtle">—</span>,
    },
    {
      header: t('field.amount'),
      className: 'w-36 text-right tabular-nums',
      // Ordena por NÚMERO, no por el texto formateado: «1.000 €» iría antes que «9 €» alfabéticamente.
      value: (p) => Number(p.amount),
      cell: (p) => money(p.amount, p.currencyCode),
    },
    {
      header: t('field.paymentDueDate'),
      className: 'w-32',
      value: (p) => p.dueDate,
      // La fecha pasada se marca en rojo: es lo que distingue un pendiente normal de uno retrasado.
      cell: (p) => (
        <span className={p.status === 'PENDING' && p.dueDate != null && p.dueDate < today ? 'text-danger' : ''}>
          {formatDate(p.dueDate)}
        </span>
      ),
    },
    {
      header: t('field.status'),
      className: 'w-40',
      value: (p) => enumLabel(p.status),
      cell: (p) => <PaymentStatusControl id={p.id} current={p.status} />,
    },
  ];

  const table = (list: Payment[], emptyTitle: string, emptyHint?: string) => (
    <RecordTable
      columns={columns}
      rows={list}
      getKey={(p) => p.id}
      empty={{ title: emptyTitle, hint: emptyHint }}
      selectable
      archive={{ entityType: 'payment' }}
      fixedLayout
    />
  );

  return (
    <ListPage title={t('nav.payments')} action={<NewRecordButton entity="payment" />}>

      {/* Totales de lo PENDIENTE, agrupados por moneda (sumar euros con dólares no significaría nada). Tras cada
          «pendiente de cobrar» va su reserva de impuestos, para no gastar dinero que en realidad no es tuyo. */}
      {totals.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {totals.map((tot) => (
            <span key={`${tot.direction}-${tot.currencyCode}`} className="contents">
              <span className="rounded-lg border border-line px-3 py-1.5">
                <span className="text-fg-muted">
                  {tot.direction === 'IN' ? t('payments.pendingIn') : t('payments.pendingOut')}:{' '}
                </span>
                <span className="font-medium tabular-nums">{money(String(tot.total), tot.currencyCode)}</span>
                <span className="text-fg-subtle"> ({tot.count})</span>
              </span>
              {tot.direction === 'IN' && (
                <span
                  className="rounded-lg border border-warning-border bg-warning-soft px-3 py-1.5 text-warning-soft-fg"
                  title={t('payments.taxReserveHint', { pct: TAX_RESERVE_PCT })}
                >
                  <span>{t('payments.taxReserve', { pct: TAX_RESERVE_PCT })}: </span>
                  <span className="font-medium tabular-nums">
                    {money(String(tot.total * (TAX_RESERVE_PCT / 100)), tot.currencyCode)}
                  </span>
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      <Tabs
        // El aviso de «pagos retrasados» del Home enlaza a `?ver=retrasados` y abre esa pestaña directamente.
        defaultIndex={view === 'retrasados' ? 2 : view === 'todos' ? 3 : view === 'completados' ? 1 : 0}
        tabs={[
          {
            label: `${t('payments.tabPending')} (${pending.length})`,
            content: table(pending, t('payments.emptyPending'), t('payments.emptyPendingHint')),
          },
          {
            label: `${t('payments.tabPaid')} (${paid.length})`,
            content: table(paid, t('payments.emptyPaid')),
          },
          {
            label: `${t('payments.tabOverdue')} (${overdue.length})`,
            content: table(overdue, t('payments.emptyOverdue'), t('payments.emptyOverdueHint')),
          },
          { label: `${t('payments.tabAll')} (${rows.length})`, content: table(rows, t('payments.emptyAll')) },
        ]}
      />
    </ListPage>
  );
}
