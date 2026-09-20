/**
 * Los valores canónicos de los enums viven en `@ct/domain` (doc 5 §36: definidos en el
 * Domain layer). Aquí sólo se re-exportan para que los CHECK constraints del schema y la
 * capa de persistencia usen la misma fuente. `@ct/db` depende de `@ct/domain` (correcto:
 * persistencia conoce el dominio; el dominio no conoce el ORM).
 */
export * from '@ct/domain';
