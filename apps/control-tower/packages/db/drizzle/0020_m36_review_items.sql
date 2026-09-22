CREATE TABLE "review_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" varchar NOT NULL,
	"kind" varchar,
	"url" text,
	"status" varchar NOT NULL,
	"sector" varchar,
	"source" varchar,
	"notes" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("notes", ''))) STORED,
	CONSTRAINT "review_items_status_check" CHECK ("review_items"."status" IN ('TO_REVIEW', 'REVIEWING', 'REVIEWED', 'DISCARDED'))
);
--> statement-breakpoint
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_items_org_status_idx" ON "review_items" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "review_items_search_idx" ON "review_items" USING gin ("search_vector");