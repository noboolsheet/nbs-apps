/**
 * Barrel del schema Drizzle — 28 tablas MVP (doc 5 §47 + portfolio_items ADR-001),
 * agrupadas por bounded context. El orden de creación/migración lo resuelve drizzle-kit
 * a partir de las FKs (incl. la FK circular projects ↔ project_phases).
 */
export * from './enums';
export * from './organizations';
export * from './auth';
export * from './governance';
export * from './crm';
export * from './operations';
export * from './knowledge';
export * from './infrastructure';
export * from './calendar';
