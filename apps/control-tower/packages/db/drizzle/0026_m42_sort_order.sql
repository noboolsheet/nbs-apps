-- M42 (E-12, owner 2026-09-26) — Orden manual de filas en las listas que lo piden.
--
-- `sort_order` existía sólo en strategic_areas y project_phases. E-12 (reordenar arrastrando) se pedía además en
-- portafolio, objetivos de un área, entregables de un proyecto y subtareas de una tarea, así que esas cuatro
-- tablas necesitan la columna.
--
-- Decisiones:
--   · `NOT NULL DEFAULT 0`: un registro nuevo nace en 0 y la lista desempata por su criterio de siempre
--     (fecha o nombre), así que aparece arriba sin necesidad de reordenar nada al crearlo.
--   · En `tasks` la columna la usan **sólo las subtareas** dentro de su padre. Las tareas de proyecto y la vista
--     global siguen ordenadas por vencimiento: ahí el orden manual no querría decir nada.
--   · El relleno inicial respeta **el orden que hoy se ve en pantalla**, para que activar esto no mueva nada de
--     sitio: si se rellenara todo a 0, el desempate seguiría siendo el de antes, pero en cuanto se arrastrara una
--     fila el resto quedaría en un orden arbitrario. Con el backfill, arrastrar una fila mueve sólo esa.
ALTER TABLE "portfolio_items" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

-- Portafolio: lista plana por organización, hoy ordenada por fecha de creación descendente y nombre.
UPDATE "portfolio_items" p SET "sort_order" = o.rn
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "organization_id" ORDER BY "created_at" DESC, "name" ASC) AS rn
  FROM "portfolio_items"
) o
WHERE p."id" = o."id";--> statement-breakpoint

-- Objetivos: se reordenan DENTRO de su área estratégica.
UPDATE "goals" g SET "sort_order" = o.rn
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "strategic_area_id" ORDER BY "created_at" DESC) AS rn
  FROM "goals"
) o
WHERE g."id" = o."id";--> statement-breakpoint

-- Entregables: dentro de su proyecto.
UPDATE "deliverables" d SET "sort_order" = o.rn
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "project_id" ORDER BY "created_at" DESC) AS rn
  FROM "deliverables"
) o
WHERE d."id" = o."id";--> statement-breakpoint

-- Subtareas: dentro de su tarea padre (las tareas sin padre se quedan en 0, no usan orden manual).
UPDATE "tasks" t SET "sort_order" = o.rn
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "parent_task_id" ORDER BY "created_at" ASC) AS rn
  FROM "tasks" WHERE "parent_task_id" IS NOT NULL
) o
WHERE t."id" = o."id";
