ALTER TABLE "knowledge_inbox" ADD COLUMN "knowledge_type" varchar;--> statement-breakpoint
ALTER TABLE "knowledge_inbox" ADD COLUMN "sector" varchar;--> statement-breakpoint
ALTER TABLE "knowledge_inbox" ADD CONSTRAINT "knowledge_inbox_type_check" CHECK ("knowledge_inbox"."knowledge_type" IN ('NOTE', 'LESSON', 'INSIGHT', 'PROCESS', 'PATTERN', 'RESEARCH', 'REFERENCE'));