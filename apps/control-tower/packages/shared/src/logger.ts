/**
 * Logger estructurado mínimo (JSON a stdout). Sin dependencias externas en MVP
 * (doc 4 §36: structured logs + health checks, sin Prometheus/Grafana/Loki todavía).
 * Regla de seguridad: nunca loguear secretos/tokens (doc 3 §26.3, doc 4 §34).
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function currentThreshold(): number {
  const configured = (process.env.LOG_LEVEL as LogLevel | undefined) ?? 'info';
  return LEVEL_ORDER[configured] ?? LEVEL_ORDER.info;
}

function emit(level: LogLevel, message: string, fields?: LogFields): void {
  if (LEVEL_ORDER[level] < currentThreshold()) return;
  const record = {
    level,
    time: new Date().toISOString(),
    message,
    ...fields,
  };
  const line = JSON.stringify(record);
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(bindings: LogFields): Logger;
}

export function createLogger(bindings: LogFields = {}): Logger {
  return {
    debug: (message, fields) => emit('debug', message, { ...bindings, ...fields }),
    info: (message, fields) => emit('info', message, { ...bindings, ...fields }),
    warn: (message, fields) => emit('warn', message, { ...bindings, ...fields }),
    error: (message, fields) => emit('error', message, { ...bindings, ...fields }),
    child: (childBindings) => createLogger({ ...bindings, ...childBindings }),
  };
}

export const logger = createLogger({ service: 'control-tower' });
