import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getDb, getSql, closeDb } from './client';
import { logger } from '@ct/shared';

/**
 * Aplica las migraciones generadas por drizzle-kit (carpeta ./drizzle).
 * DoD migración (IMP-008): debe aplicar desde una DB limpia. Las migraciones reales
 * se generan en M02; en M01 este runner ya está listo y no falla si no hay migraciones.
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const log = logger.child({ task: 'migrate' });
  log.info('applying migrations');
  try {
    // Fuerza la creación del pool antes de migrar.
    getSql(url);
    await migrate(getDb(url), { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
    log.info('migrations applied');
  } catch (error) {
    log.error('migration failed', { error: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}

void main();
