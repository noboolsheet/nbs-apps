-- M43 (owner 2026-09-27) — «Prompt» como tipo de conocimiento.
--
-- `knowledge_type` es un VARCHAR con CHECK (no un enum de Postgres), así que ampliar el conjunto es sustituir el
-- CHECK por el nuevo. Se hace en las DOS tablas que lo llevan —`knowledge_items` y `knowledge_inbox`—: si se
-- olvidara la bandeja, una captura clasificada como prompt fallaría al guardarse con un error de constraint.
--
-- Por qué un tipo propio y no reutilizar «Nota» o «Referencia»: un prompt es conocimiento reutilizable con su
-- propio ciclo (se prueba, se afina, se vuelve a usar) y sin tipo propio no se puede filtrar la biblioteca por él.
ALTER TABLE "knowledge_items" DROP CONSTRAINT IF EXISTS "knowledge_items_type_check";--> statement-breakpoint
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_type_check"
  CHECK ("knowledge_type" IN ('NOTE', 'LESSON', 'INSIGHT', 'PROCESS', 'PATTERN', 'RESEARCH', 'REFERENCE', 'PROMPT'));--> statement-breakpoint

ALTER TABLE "knowledge_inbox" DROP CONSTRAINT IF EXISTS "knowledge_inbox_type_check";--> statement-breakpoint
ALTER TABLE "knowledge_inbox" ADD CONSTRAINT "knowledge_inbox_type_check"
  CHECK ("knowledge_type" IN ('NOTE', 'LESSON', 'INSIGHT', 'PROCESS', 'PATTERN', 'RESEARCH', 'REFERENCE', 'PROMPT'));
