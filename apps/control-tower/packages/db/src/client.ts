import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { instrumentSql } from './instrument';

/**
 * Conexión a PostgreSQL (postgres.js + Drizzle). Un único pool por proceso.
 * El schema se registra en M02; aquí sólo el cliente y el pool.
 */
export type Database = ReturnType<typeof drizzle>;
/** Transacción de drizzle (el arg del callback de `db.transaction`). */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
/** Acepta tanto la conexión como una transacción (para funciones usables dentro de una tx). */
export type DbOrTx = Database | Transaction;

let sql: ReturnType<typeof postgres> | undefined;
let db: Database | undefined;

export function getSql(databaseUrl: string = requireDatabaseUrl()): ReturnType<typeof postgres> {
  if (!sql) {
    // Instrumentado siempre (E-14): mide cada consulta y avisa de las lentas. Coste despreciable.
    sql = instrumentSql(postgres(databaseUrl, { max: 10, onnotice: () => {} }));
  }
  return sql;
}

export function getDb(databaseUrl: string = requireDatabaseUrl()): Database {
  if (!db) {
    db = drizzle(getSql(databaseUrl));
  }
  return db;
}

/** Cierra el pool (tests / apagado ordenado del worker). */
export async function closeDb(): Promise<void> {
  if (sql) {
    await sql.end({ timeout: 5 });
    sql = undefined;
    db = undefined;
  }
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  // Durante `next build` (Next fija NEXT_PHASE) no hay conexión real: se construyen los
  // módulos que instancian el cliente (p. ej. el adapter de Better Auth). Devolvemos una URL
  // placeholder que nunca se conecta. En runtime NEXT_PHASE es undefined → falla claro si falta.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return 'postgres://build:build@127.0.0.1:5432/build';
  }
  throw new Error('DATABASE_URL is not set');
}
