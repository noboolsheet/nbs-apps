-- M44 (owner 2026-09-27) — **bloc de notas rápidas** del Inicio.
--
-- Qué resuelve: «notas rápidas sobre ideas que me vengan a la mente y no sepa qué hacer con ellas, anotarlas aquí y
-- luego decidir si persistirlas en alguna sección en específico». Es un cajón de PASO, no un archivo: una nota vive
-- aquí hasta que se le da un destino (tarea, decisión, conocimiento o «por revisar») o se descarta, y en los dos
-- casos la fila **desaparece** — el rastro queda en `audit_logs`, con el destino al que fue.
--
-- Por qué una tabla propia y no `knowledge_inbox` (que es el otro cajón de entrada): la bandeja es para CONTENIDO
-- capturado, tiene estados, canales por webhook, promoción a la biblioteca y su propio barrido; esto es un pósit. El
-- owner eligió tenerlo aparte (2026-09-27) después de ver las dos opciones.
--
-- Por eso NO lleva `archived_at` ni `status`: no hay nada que archivar en una nota que se va cuando se resuelve, y
-- añadir la columna la metería en el circuito de Archivados, que es justo lo contrario de lo que es.
CREATE TABLE IF NOT EXISTS "quick_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "body" text NOT NULL,
  "created_by_user_id" uuid REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  -- Una nota vacía no dice nada y ocuparía sitio en el bloc: se rechaza en la base, no sólo en el Zod.
  CONSTRAINT "quick_notes_body_not_empty" CHECK (length(btrim("body")) > 0)
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quick_notes_org_idx" ON "quick_notes" ("organization_id", "created_at" DESC);
