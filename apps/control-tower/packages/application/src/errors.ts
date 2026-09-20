import { AppError } from '@ct/shared';

/** Traduce errores de PostgreSQL (postgres.js expone `.code` SQLSTATE) a AppError. */
export function mapDbError(error: unknown, context?: { entity?: string }): AppError {
  const code = (error as { code?: string })?.code;
  if (code === '23505') {
    return new AppError({
      code: 'DUPLICATE',
      kind: 'CONFLICT',
      message: `Ya existe un registro con esos valores únicos${context?.entity ? ` (${context.entity})` : ''}`,
      cause: error,
    });
  }
  if (code === '23503') {
    return new AppError({
      code: 'FK_VIOLATION',
      kind: 'VALIDATION',
      message: 'Referencia inválida a una entidad relacionada',
      cause: error,
    });
  }
  if (code === '23514') {
    return new AppError({
      code: 'CHECK_VIOLATION',
      kind: 'VALIDATION',
      message: 'Valor fuera del conjunto permitido',
      cause: error,
    });
  }
  if (error instanceof AppError) return error;
  return new AppError({
    code: 'DB_ERROR',
    kind: 'INTERNAL',
    message: 'Error de base de datos',
    cause: error,
  });
}

export function notFound(entity: string): AppError {
  return new AppError({ code: 'NOT_FOUND', kind: 'NOT_FOUND', message: `${entity} no encontrado` });
}

/** El proyecto está cerrado: sus tareas y su estado quedan congelados (para cambios, crear un proyecto nuevo). */
export function projectClosed(): AppError {
  return new AppError({
    code: 'PROJECT_CLOSED',
    kind: 'CONFLICT',
    message: 'El proyecto está cerrado y no admite cambios. Crea un proyecto nuevo si necesitas modificar algo.',
  });
}

/** La oportunidad está archivada: no admite cambios ni añadir tareas. Restáurala para volver a editarla. */
export function opportunityArchived(): AppError {
  return new AppError({
    code: 'OPPORTUNITY_ARCHIVED',
    kind: 'CONFLICT',
    message: 'La oportunidad está archivada y no admite cambios. Restáurala para volver a editarla.',
  });
}

/** Oportunidad cerrada (columna "Cerradas"): sus tareas quedan congeladas (no se modifican). */
export function opportunityClosed(): AppError {
  return new AppError({
    code: 'OPPORTUNITY_CLOSED',
    kind: 'CONFLICT',
    message: 'La oportunidad está cerrada; sus tareas quedan congeladas y no admiten cambios.',
  });
}

/**
 * Las oportunidades **no se crean en Control Tower** (owner 2026-09-02): nacen en Twenty y CT sólo mueve su estado.
 * Lo lanza `createOpportunity` cuando el actor es un USUARIO; el sync (actor SYSTEM) sí puede crearlas.
 */
export function opportunityExternalOnly(): AppError {
  return new AppError({
    code: 'OPPORTUNITY_EXTERNAL_ONLY',
    kind: 'CONFLICT',
    message: 'Las oportunidades se crean en Twenty; Control Tower sólo mueve su etapa.',
  });
}

/** Campo gestionado por un sistema externo: no editable en CT para un registro importado de ese proveedor. */
export function fieldOwnedExternally(field: string, providerLabel: string): AppError {
  return new AppError({
    code: 'FIELD_OWNED_EXTERNALLY',
    kind: 'CONFLICT',
    message: `El campo «${field}» lo gestiona ${providerLabel} y no puede editarse aquí (se edita en el origen).`,
  });
}

/** A-1 (ADR-005): un proyecto de tipo CLIENT debe tener cliente. */
export function projectClientRequired(): AppError {
  return new AppError({
    code: 'PROJECT_CLIENT_REQUIRED',
    kind: 'VALIDATION',
    message: 'Un proyecto de tipo «Cliente» necesita un cliente asignado.',
  });
}

/** A-2 (ADR-006): la decisión antigua ya fue reemplazada por otra distinta. */
export function decisionAlreadySuperseded(): AppError {
  return new AppError({
    code: 'DECISION_ALREADY_SUPERSEDED',
    kind: 'CONFLICT',
    message: 'Esa decisión ya fue reemplazada por otra.',
  });
}

/**
 * Un recurso de «Por revisar» ya marcado como REVISADO no admite cambios (regla `isReviewItemFrozen`).
 * Se puede seguir procesando a la biblioteca: eso no modifica el recurso, sólo lo enlaza.
 */
export function reviewItemFrozen(): AppError {
  return new AppError({
    code: 'REVIEW_ITEM_REVIEWED',
    kind: 'CONFLICT',
    message:
      'Este recurso ya está marcado como revisado y no admite cambios. Si aún no lo has pasado a la biblioteca, usa «Procesar».',
  });
}

/**
 * La retención no borra un recurso REVISADO que todavía no está en la biblioteca: sería tirar lo único
 * que queda de él. Ver `purgeReviewedItems`.
 */
export function reviewItemNotPromoted(): AppError {
  return new AppError({
    code: 'REVIEW_ITEM_NOT_PROMOTED',
    kind: 'CONFLICT',
    message: 'Este recurso está revisado pero no se ha pasado a la biblioteca; procesarlo antes de borrarlo.',
  });
}
