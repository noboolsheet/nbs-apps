-- M39 (owner 2026-09-02) — Realineado del pipeline de oportunidades con Twenty.
--
-- Twenty pasó de 10 a 13 stages y CT se quedó desalineado: el pull caía a LEAD cualquier stage desconocido
-- (RESEARCHING, ONBOARDED…) y el write-back empujaba a Twenty valores que allí ya no existen (PROPOSAL,
-- CANCELLED, CLOSED) → 400. Este migration deja el enum 1:1 con Twenty.
--
-- Reetiquetado de lo que había (owner: en la Pi sólo hay dos oportunidades, una CLOSED y una WON; el resto de
-- equivalencias se incluyen para que la migración sea segura en cualquier base — dev, backups, seed):
--   CONTACTED → LEAD            (mismo sitio: columna «Calificación de leads»)
--   PROPOSAL  → PROPOSAL_SENT   (la propuesta ya salió; columna «Propuesta»)
--   CANCELLED → LOST            (cierre sin ganar; conserva status LOST)
--   CLOSED    → ONBOARDED       (ganada y cerrada; conserva status WON)
ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_stage_check";--> statement-breakpoint

UPDATE "opportunities" SET "stage" = 'LEAD'          WHERE "stage" = 'CONTACTED';--> statement-breakpoint
UPDATE "opportunities" SET "stage" = 'PROPOSAL_SENT' WHERE "stage" = 'PROPOSAL';--> statement-breakpoint
UPDATE "opportunities" SET "stage" = 'LOST'          WHERE "stage" = 'CANCELLED';--> statement-breakpoint
UPDATE "opportunities" SET "stage" = 'ONBOARDED'     WHERE "stage" = 'CLOSED';--> statement-breakpoint

-- `status` es derivado del stage: WON/ONBOARDED → WON, LOST → LOST, el resto (incluido ON_HOLD) → OPEN.
UPDATE "opportunities"
   SET "status" = CASE
     WHEN "stage" IN ('WON', 'ONBOARDED') THEN 'WON'
     WHEN "stage" = 'LOST' THEN 'LOST'
     ELSE 'OPEN'
   END;--> statement-breakpoint

-- Invariante que mantienen los comandos: `closed_at` sólo tiene valor en un stage terminal. WON deja de serlo
-- (ahora vive en la columna «Negociación» y se puede mover), así que su marca de cierre se limpia; el momento en
-- que se ganó sigue registrado en `change_events`.
UPDATE "opportunities" SET "closed_at" = NULL WHERE "stage" NOT IN ('LOST', 'ONBOARDED');--> statement-breakpoint

ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_stage_check" CHECK ("opportunities"."stage" IN ('LEAD', 'QUALIFIED', 'RESEARCHING', 'MEETING', 'EVALUATING', 'PREPARING_PROP', 'PROPOSAL_SENT', 'NEGOTIATION', 'CONTRACTING', 'WON', 'LOST', 'ON_HOLD', 'ONBOARDED'));
