/**
 * Tono/color por estado, compartido por StatusBadge (solo lectura) y StatusSelect (editable).
 * Nunca depende sólo del color (doc 6/7 §17): siempre acompaña icono + etiqueta.
 */
export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'neutral';

const TONE: Record<string, Tone> = {
  // verdes (activo / disponible / aprobado)
  ACTIVE: 'green',
  AVAILABLE: 'green',
  APPROVED: 'green',
  READY: 'green',
  DELIVERED: 'green',
  WON: 'green',
  DONE: 'green',
  PUBLISHED: 'green',
  PROCESSED: 'green', // captura ya procesada (vive en la biblioteca)
  // ámbar (en progreso / revisión / pausa)
  DEVELOPING: 'amber',
  DESIGNING: 'amber',
  IN_PROGRESS: 'amber',
  REVIEW: 'amber',
  PAUSED: 'amber',
  PROCESSING: 'amber',
  DISCARDED: 'amber', // captura descartada (anaranjado)
  PENDING: 'amber', // a la espera (pagos, procesos, bandeja de salida)
  TO_REVIEW: 'amber',
  REVIEWING: 'amber',
  CANDIDATE: 'amber',
  IN_PREPARATION: 'amber',
  // azul (cerrado sin más que hacer: un pago ya pagado, un recurso ya revisado)
  PAID: 'blue',
  REVIEWED: 'blue',
  // rojo (bloqueado / error / perdido)
  BLOCKED: 'red',
  ERROR: 'red',
  LOST: 'red',
  FAILED: 'red',
  NEW: 'red', // captura nueva sin procesar (exclusivo de knowledge_inbox)
  // neutro (plan / idea / borrador / retirado / archivado / inactivo)
  PLANNED: 'neutral',
  IDEA: 'neutral',
  DRAFT: 'neutral',
  TODO: 'neutral',
  RETIRED: 'neutral',
  ARCHIVED: 'neutral',
  INACTIVE: 'neutral',
  CORE: 'neutral', // automatización del núcleo (siempre activa)
  DEPRECATED: 'neutral',
  NOT_ELIGIBLE: 'neutral',
};

// Clases por tono, vía tokens de tema (pares "soft"): cambiar el color se hace en globals.css, no aquí.
const CLASSES: Record<Tone, string> = {
  green: 'bg-success-soft text-success-soft-fg',
  amber: 'bg-warning-soft text-warning-soft-fg',
  red: 'bg-danger-soft text-danger-soft-fg',
  blue: 'bg-info-soft text-info-soft-fg',
  neutral: 'bg-neutral-soft text-neutral-soft-fg',
};

const ICON: Record<Tone, string> = { green: '●', amber: '◐', red: '■', blue: '◆', neutral: '○' };

/** Clase base de la píldora (layout, sin color). */
export const badgeBase = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium';

/** Clases de color + icono de un tono (compartido por estado y salud). */
export function toneClasses(tone: Tone): { cls: string; icon: string } {
  return { cls: CLASSES[tone], icon: ICON[tone] };
}

/** Devuelve las clases de color y el icono para un estado (desconocido → neutro). */
export function statusTone(status: string): { cls: string; icon: string } {
  return toneClasses(TONE[status] ?? 'neutral');
}
