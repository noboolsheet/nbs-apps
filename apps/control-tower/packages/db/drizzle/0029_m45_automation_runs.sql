-- M45 (E-8, owner 2026-09-27) — **huella de los barridos**.
--
-- El problema: de los siete barridos que corren solos cada día —dos de ellos ARCHIVAN y BORRAN datos— no se sabía
-- desde la app si habían corrido ni qué habían hecho. `getAutomation` calculaba «última ejecución» **sólo** para los
-- `sync.*` (leyendo la tabla `jobs`), porque los barridos no pasan por la cola: se ejecutan en el tick del worker y
-- lo único que dejaban era una línea en su log. Un borrado automático sin rastro visible es justo lo que no se puede
-- quedar así.
--
-- Por qué una tabla y no reutilizar `sync_runs`: esa es de los syncs y lo lleva en los huesos (provider NOT NULL, FK
-- a la integración, contadores created/updated/deleted/archived). Un barrido no tiene proveedor ni integración, y su
-- resultado es de otra forma («archivados: 3», «borrados: 0, conservados: 2»). Se guarda en `result` (jsonb) para no
-- inventar una columna por cada barrido.
--
-- Por qué no la tabla `jobs`: los barridos no son jobs. Convertirlos lo sería más «gratis», pero cambiaría su
-- ejecución (cola, reintentos, reaper) por un problema que es de observabilidad, no de ejecución.
CREATE TABLE IF NOT EXISTS "automation_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  -- Clave del catálogo de automatizaciones (`sweep.terminal_archive`, `sweep.archived_purge`…). No es FK: el
  -- catálogo vive en el código, no en la base.
  "automation_key" varchar NOT NULL,
  "status" varchar NOT NULL,
  -- Qué hizo, tal cual lo devuelve el barrido: {"archived":3} · {"deleted":0,"skipped":2}. Un contador por barrido
  -- habría obligado a una migración cada vez que se añade uno.
  "result" jsonb,
  "error" text,
  "started_at" timestamp with time zone NOT NULL,
  "finished_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "automation_runs_status_check" CHECK ("status" IN ('COMPLETED', 'COMPLETED_WITH_WARNINGS', 'FAILED'))
);--> statement-breakpoint
-- La consulta de la app es siempre «la última de esta automatización en esta organización».
CREATE INDEX IF NOT EXISTS "automation_runs_key_idx" ON "automation_runs" ("organization_id", "automation_key", "started_at" DESC);
