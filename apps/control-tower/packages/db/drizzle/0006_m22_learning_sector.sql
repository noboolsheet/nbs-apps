CREATE TABLE "learning_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" varchar NOT NULL,
	"kind" varchar NOT NULL,
	"status" varchar NOT NULL,
	"sector" varchar,
	"url" text,
	"progress" integer,
	"notes" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("notes", ''))) STORED,
	CONSTRAINT "learning_items_status_check" CHECK ("learning_items"."status" IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED'))
);
--> statement-breakpoint
ALTER TABLE "knowledge_items" ADD COLUMN "sector" varchar;--> statement-breakpoint
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learning_items_org_idx" ON "learning_items" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "learning_items_org_status_idx" ON "learning_items" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "learning_items_search_idx" ON "learning_items" USING gin ("search_vector");