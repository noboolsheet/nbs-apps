import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

/**
 * Campos primitivos (input/textarea/select) y `fieldCls`: fuente única del estilo de los campos de formulario.
 * Color por tokens (border-line-strong, bg-field) → misma clase en claro/oscuro, sin `dark:`.
 * `fieldCls` NO incluye ancho: los formularios en fila lo usan tal cual; los de columna añaden `w-full`.
 */
export const fieldCls =
  'rounded border border-line-strong bg-field px-2 py-1.5 text-sm ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldCls} ${className}`} {...props} />;
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldCls} ${className}`} {...props} />;
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldCls} ${className}`} {...props} />;
}
