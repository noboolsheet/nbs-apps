import Link from 'next/link';
import { Card, cardCls } from './card';

/** Tarjeta de métrica del Executive Snapshot (doc 7 pantalla 1). */
export function MetricCard({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-fg-muted">{label}</div>
    </>
  );
  return href ? (
    <Link href={href} className={`${cardCls} block p-4 hover:bg-surface-muted/40`}>
      {inner}
    </Link>
  ) : (
    <Card className="p-4">{inner}</Card>
  );
}
