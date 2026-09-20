/**
 * Taxonomía de errores estructurada (doc 3 §30).
 * Cada error lleva `code` estable + `message`; los detalles nunca exponen stack traces
 * al usuario. El mapeo a HTTP status vive en la capa API.
 */
export type ErrorKind =
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTEGRATION'
  | 'TRANSIENT'
  | 'INTERNAL';

export interface AppErrorOptions {
  code: string;
  kind: ErrorKind;
  message: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: string;
  readonly kind: ErrorKind;
  readonly details?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'AppError';
    this.code = options.code;
    this.kind = options.kind;
    this.details = options.details;
  }
}

export const HTTP_STATUS_BY_KIND: Record<ErrorKind, number> = {
  VALIDATION: 400,
  AUTHENTICATION: 401,
  AUTHORIZATION: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTEGRATION: 502,
  TRANSIENT: 503,
  INTERNAL: 500,
};

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Vista segura para el cliente: sin stack traces ni `cause`. */
export function toClientError(error: unknown): {
  code: string;
  kind: ErrorKind;
  message: string;
  details?: Record<string, unknown>;
} {
  if (isAppError(error)) {
    return { code: error.code, kind: error.kind, message: error.message, details: error.details };
  }
  return { code: 'INTERNAL_ERROR', kind: 'INTERNAL', message: 'Internal server error' };
}
