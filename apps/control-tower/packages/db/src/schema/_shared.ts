import { sql } from 'drizzle-orm';
import { check, customType, timestamp, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';

/**
 * Helpers de columnas comunes (doc 5 §1.2–1.4). Todas las entidades principales usan
 * UUID PK; las gestionadas llevan created_at/updated_at TIMESTAMPTZ NOT NULL y, cuando
 * el lifecycle lo requiere, archived_at TIMESTAMPTZ NULL.
 */
export const pk = () => uuid('id').primaryKey().defaultRandom();
export const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
export const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();
export const archivedAt = () => timestamp('archived_at', { withTimezone: true });

/** Tipo INET nativo de PostgreSQL (doc 5 §30, audit_logs.ip_address). */
export const inet = customType<{ data: string }>({
  dataType() {
    return 'inet';
  },
});

/** Tipo BYTEA (binario). Se usa para el CSV comprimido de los lotes de log rotados (F-24). */
export const customBytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

/** Tipo TSVECTOR para búsqueda full-text (doc 5 §41; M10). */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

/**
 * Columna generada `search_vector` (STORED) = to_tsvector('simple', col1 || ' ' || col2 …).
 * Config 'simple' (sin stemming) para contenido mixto ES/EN e inmutabilidad de la generada.
 * Se acompaña de un índice GIN por tabla. Los nombres son de COLUMNA (snake_case).
 */
export function searchVector(...columnNames: string[]) {
  const parts = columnNames.map((c) => `coalesce("${c}", '')`).join(" || ' ' || ");
  return tsvector('search_vector').generatedAlwaysAs(
    sql.raw(`to_tsvector('simple', ${parts})`),
  );
}

/**
 * CHECK constraint `column IN (...)` a partir de un conjunto de valores canónico.
 * Los valores se inyectan como literales SQL (no como parámetros $1): un CHECK en DDL
 * no admite bind params, y los valores son constantes internas seguras (se escapan comillas).
 */
export function inValues(name: string, column: AnyPgColumn, values: readonly string[]) {
  const list = values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');
  return check(name, sql`${column} IN (${sql.raw(list)})`);
}
