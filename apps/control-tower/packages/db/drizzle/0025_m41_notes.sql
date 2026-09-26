-- M41 (E-15, owner 2026-09-26) — Notas por registro.
--
-- Hasta ahora no había dónde apuntar «hablado con el cliente, mueve la entrega a marzo»: existía el historial
-- (`change_events`: qué campo cambió, cuándo y quién) pero eso responde a «qué pasó», no a «qué hablamos». El
-- único hueco era el `description` de la propia entidad, que se sobrescribe.
--
-- La tabla es POLIMÓRFICA, igual que `change_events`: (entity_type, entity_id) sin FK, para que una nota pueda
-- colgar de cualquier registro sin 20 columnas nullables. La contrapartida: al borrar definitivamente un
-- registro hay que llevarse sus notas — lo hace `deleteRecordTraces` (packages/application/maintenance/archive),
-- el único sitio que conocen los tres caminos de borrado duro (purga de archivados, borrado de tareas y purga
-- de tareas completadas).
--
-- Decisiones tomadas con esta tabla:
--   · NO se espeja a Notion (no está en NOTION_MIRRORED): es trabajo interno, y el cuerpo de la página de
--     Notion ya lo escribe la persona.
--   · NO es archivable: una nota no es un registro de la aplicación, se borra y punto. Por eso no entra en
--     ARCHIVABLE ni en PURGE_ORDER.
--   · created_by_user_id es nullable: si algún día se borra un usuario, la nota sobrevive sin autor en vez de
--     bloquear el borrado.
CREATE TABLE IF NOT EXISTS "notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "entity_type" varchar NOT NULL,
  "entity_id" uuid NOT NULL,
  "body" text NOT NULL,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notes_body_not_empty" CHECK (length(btrim("body")) > 0)
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "notes" ADD CONSTRAINT "notes_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "notes" ADD CONSTRAINT "notes_created_by_user_id_users_id_fk"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- El bloque del panel pide siempre las notas de UN registro: ese es el índice que importa.
CREATE INDEX IF NOT EXISTS "notes_entity_idx" ON "notes" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notes_org_idx" ON "notes" ("organization_id");
