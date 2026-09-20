import type { HTMLAttributes } from 'react';

/** Contenedor de tarjeta (borde/superficie por token). `cardCls` para cablearlo en `<Link>`/`<li>` que no son div. */
export const cardCls = 'rounded-lg border border-line bg-surface';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${cardCls} ${className}`} {...props} />;
}
