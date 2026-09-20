import type { ButtonHTMLAttributes } from 'react';

/**
 * Botón primitivo + cadenas de clase compartidas. Fuente única de la forma/estilo de los botones: cambia aquí y se
 * propaga. Colores por tokens de tema (bg-primary/text-primary-fg, border-line-strong, bg-danger…) → misma clase en
 * claro y oscuro, sin `dark:`. Se exportan tanto el componente `<Button>` como las cadenas `btnPrimary`/`btnSecondary`/
 * `btnGhost`/`btnDanger` para cablearlas en `<button>` existentes con mínimo cambio.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'surface' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-1 rounded font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg hover:opacity-90',
  secondary: 'border border-line-strong text-fg hover:bg-surface-muted',
  // Botón SÓLIDO sobre una superficie del mismo color (p. ej. dentro de una Card): el fondo propio + la sombra son
  // los que lo hacen legible como botón; con sólo el borde se leía como un enlace enmarcado.
  surface: 'border border-line-strong bg-surface text-fg shadow-sm hover:bg-surface-muted',
  ghost: 'text-fg-muted hover:bg-surface-muted',
  danger: 'bg-danger text-white hover:opacity-90',
};

/** Cadena de clase de un botón (tamaño md), para cablearla en un `<button>` existente. */
export function buttonCls(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]}`;
}
export const btnPrimary = buttonCls('primary');
export const btnSecondary = buttonCls('secondary');
export const btnGhost = buttonCls('ghost');
export const btnDanger = buttonCls('danger');

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={`${buttonCls(variant, size)} ${className}`} {...props} />;
}
