ALTER TABLE "capabilities" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("description", '') || ' ' || coalesce("notes", ''))) STORED;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("description", '') || ' ' || coalesce("notes", ''))) STORED;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("industry", '') || ' ' || coalesce("notes", ''))) STORED;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("first_name", '') || ' ' || coalesce("last_name", '') || ' ' || coalesce("email", '') || ' ' || coalesce("job_title", ''))) STORED;--> statement-breakpoint
ALTER TABLE "opportunities" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("source", '') || ' ' || coalesce("notes", ''))) STORED;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("description", ''))) STORED;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("description", ''))) STORED;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("description", ''))) STORED;--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("context", '') || ' ' || coalesce("decision", '') || ' ' || coalesce("rationale", ''))) STORED;--> statement-breakpoint
ALTER TABLE "knowledge_items" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("summary", '') || ' ' || coalesce("content", ''))) STORED;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("name", '') || ' ' || coalesce("description", ''))) STORED;--> statement-breakpoint
CREATE INDEX "capabilities_search_idx" ON "capabilities" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "services_search_idx" ON "services" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "clients_search_idx" ON "clients" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "contacts_search_idx" ON "contacts" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "opportunities_search_idx" ON "opportunities" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "projects_search_idx" ON "projects" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "tasks_search_idx" ON "tasks" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "assets_search_idx" ON "assets" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "decisions_search_idx" ON "decisions" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "knowledge_items_search_idx" ON "knowledge_items" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "portfolio_items_search_idx" ON "portfolio_items" USING gin ("search_vector");