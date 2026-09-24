-- M40 (owner 2026-09-24) — Reconciliación de borrados en los syncs.
--
-- Contexto: hasta ahora sólo Drive y Calendar detectaban que algo había desaparecido en el origen. GitHub,
-- Twenty y Notion sólo creaban/actualizaban, así que un repo borrado en GitHub, una oportunidad borrada en
-- Twenty o una página borrada en Notion se quedaban en Control Tower para siempre y sin forma de saberlo.
--
-- Dos columnas nuevas, ambas aditivas:
--
-- 1) external_identities.missing_since — marca de "el origen ya no lo devuelve". La pone la reconciliación la
--    PRIMERA vez que el registro no aparece en el pull (y sólo entonces se archiva la fila, para no pelearse
--    con una restauración manual del usuario); se limpia en cuanto el origen vuelve a devolverlo. Va en columna
--    propia y NO en `metadata` porque `metadata` la reescribe cada sync con la URL de "Open external".
--
-- 2) sync_runs.archived — contador propio. `deleted` es borrado definitivo (sólo lo usaba Drive); lo que la
--    reconciliación hace ahora es ARCHIVAR (reversible, visible en Ajustes › Archivados). Mezclarlos haría que
--    el historial de syncs mintiera sobre lo que pasó.
ALTER TABLE "external_identities" ADD COLUMN IF NOT EXISTS "missing_since" timestamp with time zone;--> statement-breakpoint

-- Índice parcial: la reconciliación sólo pregunta por las identidades marcadas, que son una minoría.
CREATE INDEX IF NOT EXISTS "external_identities_missing_idx"
    ON "external_identities" ("organization_id", "provider")
    WHERE "missing_since" IS NOT NULL;--> statement-breakpoint

ALTER TABLE "sync_runs" ADD COLUMN IF NOT EXISTS "archived" integer DEFAULT 0 NOT NULL;
